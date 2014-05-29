/**
 * log.js 日志模块
 * 
 * @version 1.0
 * @create-date : 2014-01-09
 * @last-modified : 2014-02-28
 */

var log4js = require('log4js');
var path = require('path');

// 日志目录
var LOG_DIR = './logs';

// i'm sure log dir is exits
var fs = require('fs');
if (!fs.existsSync(LOG_DIR)) {
	// create dir
	fs.mkdirSync(LOG_DIR);
}

log4js.configure({
	appenders : [ {
		type : 'console',
		layout : {
			type : "pattern",
			pattern : "[%d %p %c %x{pid}] - %m",
			tokens : {
				pid : function() {
					return process.pid;
				}
			}
		}
	}, {
		type : "dateFile",
		filename : LOG_DIR + '/access.log',
		pattern : "_yyyy-MM-dd",
		category : 'accessLogger',
		layout : {
			type : "pattern",
			pattern : "[%d %p %c %x{pid}] - %m",
			tokens : {
				pid : function() {
					return process.pid;
				}
			}
		}
	}, {
		type : "dateFile",
		filename : LOG_DIR + '/console.log',
		pattern : "_yyyy-MM-dd",
		category : 'dateFileLog',
		layout : {
			type : "pattern",
			pattern : "[%d %p %c %x{pid}] - %m",
			tokens : {
				pid : function() {
					return process.pid;
				}
			}
		}
	}],
	replaceConsole : true, //替换console.log()
	levels : {
		dateFileLog : 'debug'
	}
});

var dateFileLog = log4js.getLogger('dateFileLog');

// how to use
// var logger = require('../log').logger;
// logger.info("this is log");
exports.logger = dateFileLog;

// how to use
//var log = require('./log');
//log.use(app);
exports.expressLogger = log4js.connectLogger(
		log4js.getLogger('accessLogger'),
		{
			level : 'info',
			format : ':http-version :method :status :response-time :url [:remote-addr] [:referrer] [:user-agent]'
		});
