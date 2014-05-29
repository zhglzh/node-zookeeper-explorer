var session = {uuid:'xx'}
var app = {zookeepers:[]};
var param = function(){
		return 'xx';
	};
var about = function() {
        console.log(this.name +' is '+ this.age +' years old');
    };


function req() {
    this.session = session;
    this.app = app;
	this.param = param;
    this.about = about;
};


exports.req = req;