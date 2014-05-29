var zookeeper = require('node-zookeeper-client');

var client = zookeeper.createClient('cp01-yxtocp077.vm.baidu.com:8181,cp01-yxtocp076.vm.baidu.com:8181');
var path = '/activemq';

function listChildren(client, path) {
    client.getChildren(
        path,
        function (event) {
            console.log('Got watcher event: %s', event);
            listChildren(client, path);
        },
        function (error, children, stat) {
            if (error) {
                console.log(
                    'Failed to list children of %s due to: %s.',
                    path,
                    error
                );
                return;
            }

            console.log('Children of %s are: %j.', path, children);
			client.close();
        }
    );
}

client.on('connected', function (state) {
    console.log('connected');
});
client.on('disconnected', function (state) {
    console.log('disconnected');
});

client.once('connected', function () {
    console.log('Connected to ZooKeeper.');
    listChildren(client, path);
});

client.connect();