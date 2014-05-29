var route = require('../routes/zk.js');
var assert = require("assert");
var rewire = require("rewire");

describe('zk route test', function () {
  describe('Method connect', function (done) {
	    it('should connect zk server', function (done) {
			var Req = rewire('./request.js');
			Req.__set__("session", {uuid:'xx'});
			Req.__set__("param", function(){
				return 'cp01-yxtocp077.vm.baidu.com:8181,cp01-yxtocp076.vm.baidu.com:8181';
			});
			var res = rewire('./response.js');
	    	route.connect(new Req.req,res);
	    });
		it('should return C', function () {
			//assert.equal(util.judge(60), 'C');
		});   
  });
  
});