var ZK = require ("node-zookeeper-client")
	, uuid = require("node-uuid");
var logger = require('../modules/log.js').logger;

var app;

exports.connect = function(req, res) {
	
	if ( !req.session.uuid ) {
		req.session.uuid = uuid.v4();
	}
	
	if ( app == null ) {
		app = req.app;
	}
	
	var connected = false;
	var timeout = 10000;
	if ( req.param("zkhost", null) == null ) {
		res.send({ status: "error", error: "No host to connect to." });
	} else {
		var zk = ZK.createClient(req.param("zkhost"),{ retries : 2 ,sessionTimeout: 30000});
		setTimeout(function() {
			if ( !connected ) {
				res.json({ status: "error", error: "Not connected to " + req.param("zkhost", null) });
			}
		}, timeout);
		zk.on('connected', function () {
			
			req.session.currentConnection = req.param("zkhost");
			
			if ( !app.zookeepers[ req.session.currentConnection ] ) {
				app.zookeepers[ req.session.uuid ] = {};
			}
			
			if ( app.zookeepers[ req.session.uuid ][ req.session.currentConnection ] != null ) {
				try {
					app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].close();
				} catch (error) {}
				app.zookeepers[ req.session.uuid ][ req.session.currentConnection ] = null;
			}
			
			zk.session = req.session.uuid;
			zk.connectionString = req.session.currentConnection;
			
			app.zookeepers[ req.session.uuid ][ req.session.currentConnection ] = zk;
			
			res.json({ status: "ok", session: req.session.uuid, connection: req.session.currentConnection });
			connected = true;
			
		});
		zk.on('disconnected',function(zkk) {
			//res.json({ status: "error", error: "Not connected to " + req.param("zkhost", null) });
		});
		
		zk.connect();
	}
};

exports.disconnect = function(req, res) {
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].close();
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ] = null;
	res.json({ status: "ok" });
};

exports.children = function(req, res) {
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].getChildren(req.param("path"), false, function(error,children,stats) {
		logger.debug(children);
		if (!error) {
			res.json({ children: children, path: req.param("path") });
		}
	})
};

exports.exists = function(req, res) {
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].exists(req.param("path"), null, function(error,stat) {
		res.json({ exists: stat!=null, path: req.param("path") });
	})
};

exports.get = function(req, res) {
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].getData(req.param("path"), null, function(error,data,stat) {
		var str = "";
		if ( data != null ) {
			for ( var i=0; i<data.length; i++ ) {
				str += String.fromCharCode( data[i] );
			}
		}
		res.json({ path: req.param("path"), stat: stat, data: str });
	})
};

exports.set = function(req, res) {
	
	if ( app.$config.Auth.requiresAuthentication ) {
		if ( !req.session.authenticated ) {
			res.json({ status: "error", error: "no_auth" });
			return;
		}
	}
	
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].setData(req.param("path"), req.param("data"), parseInt(req.param("version")+""), function(error,stat) {
		if (!error) {
			res.json({ status: "ok", path: req.param("path") });
		} else {
			res.json({ status: "error", error: error, path: req.param("path") });
		}
	})
};

exports.deleteSafe = function(req, res) {
	
	if ( app.$config.Auth.requiresAuthentication ) {
		if ( !req.session.authenticated ) {
			res.json({ status: "error", error: "no_auth" });
			return;
		}
	}
	
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].remove(req.param("path"), -1, function(err) {
		if ( err == "not empty" ) {
			res.json({ status: "error", error: "not_empty", path: req.param("path") });
		} else {
			res.json({ status: "ok", path: req.param("path") });
		}
	});
}

exports.deleteUnsafe = function(req, res) {
	
	if ( app.$config.Auth.requiresAuthentication ) {
		if ( !req.session.authenticated ) {
			res.json({ status: "error", error: "no_auth" });
			return;
		}
	}
	
	_$deregisterFromZooKeeper(app.zookeepers[ req.session.uuid ][ req.session.currentConnection ], req.param("path"), function() {
		res.json({ status: "ok", path: req.param("path") });
	});
}

exports.create = function(req, res) {
	
	if ( app.$config.Auth.requiresAuthentication ) {
		if ( !req.session.authenticated ) {
			res.json({ status: "error", error: "no_auth" });
			return;
		}
	}
	
	var rootPath = req.param("path");
	if ( rootPath == "/" ) { rootPath = ""; }
	_$createNodes( app.zookeepers[ req.session.uuid ][ req.session.currentConnection ], rootPath, req.param("nodename").split("/"), null, function(status) {
		res.json(status);
	});
}

exports.watcherRegister = function(req, res) {
	
	if ( !app.watchers[ req.session.uuid ] ) {
		app.watchers[ req.session.uuid ] = {};
	}
	app.watchers[ req.session.uuid ][ req.param("path") ] = 1;
	_$registerChildrenWatcher( app.zookeepers[ req.session.uuid ][ req.session.currentConnection ], req.param("path") );
	_$registerDataWatcher( app.zookeepers[ req.session.uuid ][ req.session.currentConnection ], req.param("path") );
	res.json({ status: "ok" });
	
}

exports.watcherRemove = function(req, res) {
	
	if ( !app.watchers[ req.session.uuid ] ) {
		app.watchers[ req.session.uuid ] = {};
	}
	app.watchers[ req.session.uuid ][ req.param("path") ] = null;
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].getChildren(req.param("path"), false, function(rc,error,children) {});
	app.zookeepers[ req.session.uuid ][ req.session.currentConnection ].getData(req.param("path"), false, function(rc,error,stat,data) {});
	res.json({ status: "ok" });
	
}

exports.watcherExists = function(req, res) {
	if ( !app.watchers[ req.session.uuid ] ) {
		app.watchers[ req.session.uuid ] = {};
	}
	if ( app.watchers[ req.session.uuid ][ req.param("path") ] != null && app.watchers[ req.session.uuid ][ req.param("path") ] != undefined ) {
		res.json({ status: "ok" });
	} else {
		res.json({ status: "error" });
	}
}

var _$registerChildrenWatcher = function(zk, path) {
	zk.getChildren(path, function(type, state, path) {
		console.log( "watcher_children", { session: zk.session, connection: zk.connectionString, path: path } );
		app.socketio.sockets.emit( "watcher_children", { session: zk.session, connection: zk.connectionString, path: path } );
		_$registerChildrenWatcher( zk, path );
	}, function(rc,error,children) {});
}

var _$registerDataWatcher = function(zk, path) {
	zk.getData(path, function(type, state, path) {
		app.socketio.sockets.emit( "watcher_data", { session: zk.session, connection: zk.connectionString, path: path } );
		_$registerDataWatcher( zk, path );
	}, function(rc,error,stat,data) {});
}

var _$createNodes = function(zk, parent, nodes, laststatus, callback) {
	var _nodes = nodes;
	if ( _nodes.length > 0 ) {
		var item = _nodes.shift();
		_$createNode(zk, parent, item, function(data) {
			if ( data.status == "ok" ) {
				_$createNodes(zk, data.path, _nodes, data, callback);
			} else {
				callback(data);
			}
		});
	} else {
		callback(laststatus);
	}
}

var _$createNode = function(zk, parent, newnode, callback) {
	zk.create( parent+"/"+newnode, "", null, function(rc, error, path) {
		if ( rc == 0 ) {
			callback( { status: "ok", path: parent+"/"+newnode, newnode: newnode } );
		} else {
			callback( { status: "error", error: error, path: parent+"/"+newnode } );
		}
	});
}

var _$deregisterFromZooKeeper = function(zk, path, callback, workingPath) {
	var currentPath = workingPath || path;
	zk.getChildren(currentPath, false, function(rc, error, data) {
		if ( data != null ) {
			if ( data.length > 0 ) {
				for ( var i=0; i<data.length; i++ ) {
					_$deregisterFromZooKeeper( zk, path, callback, currentPath + "/" + data[i] );
				}
				zk.remove(currentPath, -1, function() {})
			} else {
				zk.remove(currentPath, -1, function() {})
			}
			_$deregisterFromZooKeeper(zk, path, callback);
		} else {
			callback();
		}
	});
}

