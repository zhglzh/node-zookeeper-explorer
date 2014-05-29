module.exports = function() {
    this.session = {};
    this.app = {zookeepers:[]};
	this.param = function(){
		return 'xx';
	};
    this.send = function() {
        console.log(arguments.join(','));
    };
    this.json = function() {
        console.log(arguments.join(','));
    };	
};