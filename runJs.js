/**
 * 模块加载器
 * @autor alwbg@163.com | soei
 *  ------------------------------------
 *  -  https://github.com/alwbg/runJs  -
 *  ------------------------------------
 * @Date 2015/4/23
 * 内部声明名称与文件名称不一致时, 请用alias '[模块短连接]':'[文件路径][#][模块名称]'
 * @update 2016/1/8 修改低版本的加载问题.
 * @update 2016/4/12 修改获取模块ID问题 短ID和长ID的对称性
 * @update 2016/4/15 整理映射表
 *         1. 修改了获取模版ID的相关逻辑
 *         2. 修改了加载中的模块对应的映射表
 *         3. 修改计算模版ID 计算及存的逻辑, 只做计算不存储
 *         4. 修改只删除AMD模块执行创建的费对象问题
 * @update 2017/6/23 新增对HTML内的runJs代码块的支持
 *         <!--其中先执行代码块内的代码,再执行main模块的代码-->
 *         <script src="runjs.js" main="main" >
 *         		//module-name = "__runjs.inner__"
 *         		var $ = require( 'query' );
 *         		$( 'test' ).appendTo( 'body' );
 *         		//exports 为方法块内部对象
 *         		exports.run = function(){
 *         		}
 *         		//为模块间传递参数
 *         		return {
 *         			language : {zh:{},en:{}}
 *         		}
 *         </script>
 * @update 2017/7/5 22:30 修改 _async_require_map._async_fx__ 对ES6 function新语法支持
 * 目前支持的
 * - firefox2.0以上(低版本由于不能安装没办验证)
 * - webkit 534版本及以上, 低版本未验证
 * - IE5以上
 * - opera
 * creation-time : 2019-05-15 11:56:59 AM
 */
(function( global ){
	'use strict';
	var _SELF;
	//模版ID名称属性 针对html JS属性值 第一次加载用
	var	MODULE_NAME 		= 'deps-name';
	//define name
	var DEFINE_NAME 		= 'define';
	//require name
	var REQUIRE_NAME		= 'require';
	var STRING_MAIN 		= 'main';
	var STRING_OBJECT		= 'object';
	var STRING_ARRAY 		= 'array';
	var PATH_NAME 			= 'path';
	var EMPTY_STRING 		= '';

	var STRING_SCRIPT 		= 'script';

	var $1 					= '$1';
	var $1$2 				= '$1$2';
	//空数组
	var	EMPTY_ARRAY			= [];
	//对象原型
	var EMPTY_OBJECT		= Object.prototype;
	//数组的push方法
	var EMPTY_ARRAY_PUSH 	= EMPTY_ARRAY.push;
	var EMPTY_ARRAY_SLICE 	= EMPTY_ARRAY.slice;

	//define()参数类型
	var DEFINE_TYPES 		= [ 'String', Array, Function ];

	var CONTEXT_PATH 		= location.pathname.replace( /[^\/]*$/, EMPTY_STRING );
	var USERAGENT 			= navigator.userAgent;
	//css不支持onload事件的老浏览器
	var IS_WEBKIT_LOW 		= USERAGENT.replace(/.*webkit\/([\d]+).*/i, $1 ) 	<= 534;
	//firefox 9.0以下版本不支持css onload回调
	var IS_FIREFOX_LOW 		= USERAGENT.replace(/.*firefox\/([\d\.]+).*/i, $1 ) 	< 9.0;

	debug( USERAGENT );

	//是否只支持单加载机制的浏览器
	var IS_LONG_LONG_AGO 	= IS_WEBKIT_LOW || IS_FIREFOX_LOW;

	/**
	 * 检出define的factory的参数名称
	 * 是CMD模式时且形参有效时
	 * define(function(a,b,c){
	 * 	a('xxx')
	 * })
	 * 匹配其中的形参a
	 * @type {RegExp}
	 */
	var SIGN_REQUIRE 	= /^\w*\(\s*([^\),\s]+)(?:=>)?/;
	/**
	 * 做链接使用, 匹配require的参数
	 * @type {String}
	 */
	var SIGN_MARK 		= '\\s*\\(\\s*(?:\'([^\']+)\'|"([^"]+)")\\s*\\)';
	/**
	 * Opera lt 12.x | !IE | !webkit
	 * 匹配当前JS全路径
	 * 通过强制报错获取错误堆栈列表.
	 * Firefox结尾会有换行符\r\n
	 * chrome         - at http://...:1:1
	 * opera Firefox  - @http://...:1:1
	 * IE 10+         - at Global code (http:...:1:1)
	 * safari         - global code@http:...:1:1
	 * 目前之匹配 http(s) 和 file协议的连接地址
	 * file:///Z:/soei/Sites/...
	 */
	var ERR_STACK_REG = /[\D\d]*(?:at|@).*((?:http(?:s|)|file)\:(?:\:(?!\d)|[^\:])*)(?:\:\d*){1,}(?:\)|\r|\n|)$/i;

	//寄生类的访问分隔符
	var INNER_CLASS_SEP 	= '#';

	//声明内部对象
	var Qma 	= global._Qma || {};

	//配置相关版本
	var version = Qma.v || EMPTY_STRING;
	//存储入口js的路径
	var	mainJsPath 		= null,
		mainJsUri 		= null,
		//任务列队
		tasks 			= [],
		//依赖列队
		_TaskKeys		= [],
		//模块集合映射 活跃的版块
		modules 		= {},
		//加载模版映射表
		loadingMap 		= {},
		/**
		 * 公共对象
		 * @type {Object}
		 */
		com 			= {},
		_depends 		= Qma.depends || {},
		//声明的短链
		alias 			= {};
	//缓存请求ID
	com.requireIDs 		= {};
	//拷贝属性
	merge( alias, Qma.alias );
	Qma.comp = function( script, src ){
		var link = script.getAttribute( MODULE_NAME );
		src = src.split( INNER_CLASS_SEP )[ 0 ];
		return link == src || src == script.src;
	}
	/**
	 * 弥补查找当前页面时未找到当前执行环境
	 * @return {Object}
	 */
	Qma.tmp = { getAttribute : function(){return location.host} };
	/**
	 * 通过src获取javascript对象
	 * @param  {Uri} js路径
	 * @param  {Context} 上下文
	 * @return {Script}
	 */
	Qma.getScriptByUri = function ( src, context ){
		for( var i = context.length, script; script = context[ --i ]; ){
			if( _SELF != script && this.comp( script, src ) ) break;
		}
		return script || this.tmp;
	}

	/**
	 * 模块仓库
	 * ...[id] = Task;
	 * @type {Object}
	 */
	com.moduleStorage 		= {};

	/**
	 * 计算模块ID
	 * @param  {String} id 模块ID
	 * @return {String}    处理后的
	 */
	com.toRealMI = function( id ){
		return com.uri.real( alias[ id ] || id );
	}
	/**
	 * 判断是该模板是否存在
	 * @param  {String}  id 模版ID
	 * @return {Task}
	 */
	com.isInStorage = function( id ){
		return com.moduleStorage[ this.toRealMI( id ) ];
	}
	/**
	 * 判断是否在加载请求列表中
	 * @param  {String}  id
	 * @return {Object}    返回并创建映射
	 */
	com.isInLoading = function( id ){
		var id = id.realMI();
		id = alias[id.split(INNER_CLASS_SEP)[0]] || id;
		var ali = loadingMap[ id ];
		return !ali && ( loadingMap[ id ] = id ), ali;
	}
	com.cleanLoadingMark = function( id ){
		delete loadingMap[id.realMI()];
	}
	/**
	 * 获取当前执行上下文环境的模块ID
	 * @return {String}
	 */
	com.pickMI = function(){
		return self().getAttribute( MODULE_NAME );
	}

	com.moduleIdRMap = {};
	/**
	 * 获取模块ID
	 * @param  {String} id   自定义模块ID
	 * @param  {String} name 当前加载模块默认ID
	 * @return {String}      最终需要的模块ID
	 */
	com.moduleId = function( id, name ){
		var RID = this.moduleIdRMap[ id ] || ( this.moduleIdRMap[ id ] = new RegExp( id + '(?:$|\\.js)', 'i' ) )
		if( ! RID.test( name ) ){
			name = name + INNER_CLASS_SEP + id;
		}
		return alias[ id ] = (name||id).realMI();
	}
	/**
	 * 判断是否已在已加载列表
	 */
	com.isInModules = function( key ){
		return modules[ key ];
	}

	/**
	 * 获取匹配require('')的正则表达式
	 * 包含了压缩后的形参变量
	 * @see  SIGN_REQUIRE
	 * @see  SIGN_MARK
	 * @return {RegExp}
	 */
	com.pull = function( fx, factory ){
		var $1,
		name = factory.cmd 
			&& SIGN_REQUIRE.test( fx )
			&& ($1 = RegExp.$1)
			&& $1 != REQUIRE_NAME ? '|' + RegExp.$1 : EMPTY_STRING;
		return new RegExp( '[^a-z](?:' + REQUIRE_NAME +  name + ')' + SIGN_MARK, 'ig' );
	}
	/**
	 * 字符串自身是否含有指定元素
	 * @param  {String|RegExp}  is 要查找的元素 正则或者字符串
	 * @return {Boolean}
	 */
	String.prototype.has = function( is ){
		if( isString( is ) ) is = this.indexOf( is ) > -1;
		if( isRegExp( is ) ) is = is.test( this );
		return is;
	}
	/**
	 * 格式化模块ID
	 * @return {String} 处理完后的
	 */
	String.prototype.realMI = function(){
		return com.toRealMI( this );
	}

	/**
	 * 创建对象
	 * @param  {String} tagname 名称
	 * @return {Object}         创建的对象
	 */
	function createByTagName( tagname ){
		return document.createElement( tagname );
	}
	/**
	 * 获取指定名称的所有DOM
	 * @param  {String} name    要查的tagName
	 * @param  {Object} context 上下文
	 * @return {HTMLCollection}  结果集
	 */
	function getTags( name, context ){
		return ( context || document ).getElementsByTagName( name );
	}

	//获取script列表
	var _Scripts 		= getTags( STRING_SCRIPT );
	//存储head DOM对象
	var HEAD 			= getTags( 'head' )[0];

	/**
	 * 创建一个模块类
	 * @param {String} 模块ID
	 * @param {module} 模块对象
	 */
	function Module( id, exports ){
		this.id 		= id;
		this.exports 	= exports;
		modules[ id ] 	= exports;
	}
	/**
	 * 重新建立关系
	 * @return {Module}
	 */
	Module.prototype.rebulid = function(){
		modules[ this.id ] = this.exports;
		return this;
	}
	/**
	 * 任务列表对象
	 * @param {String}  任务ID
	 * @param {JSON|Module}    任务模版对象
	 */
	function Task( id, module ){
		//设置任务ID
		this.id 		= id;

		//设置任务集
		this.module 	= module;
		this.moduleID 	= module.id;
		this.wake();
	}
	merge( Task.prototype, {
		/**
		 * 会话公用依赖列表
		 * @type {Object}
		 */
		active : {},
		/**
		 * 对存库的一个引用
		 * @type {[type]}
		 */
		storage : com.moduleStorage,

		echo : echo,
		each : each,
		tools : new Util(),
		/**
		 * 获取模块信息
		 * @see Task()
		 * @return {JSON} { id : moduleID, deps : deps, factory : factory, script? : ? }
		 */
		data : function(){
			return this.module;
		},
		/**
		 * 唤醒会话 入库
		 */
		wake : function(){
			return this.storage [ this.moduleID ] = this, this;
		},
		/**
		 * 入栈队
		 */
		stack : function(){
			return tasks.push( this ), this;
		},
		//删除AMD模式创建的回调式的模版 每次创建都是新的
		remove : function(){
			return this.id == REQUIRE_NAME && delete this.storage[ this.moduleID ], this;
		},
		space : function(){
			delete modules[ this.moduleID ];
			return this.remove();
		},
		/**
		 * 获取依赖列表
		 */
		depend : function(){
			var module = this.data();
			//增加配置依赖
			if( module.alias in _depends ){
				EMPTY_ARRAY_PUSH.apply( module.deps, ( _depends[ module.alias ] || {} ).deps || [] );
			}
			//增加依赖
			if( isFunction( module.factory ) ){
				EMPTY_ARRAY_PUSH.apply( module.deps, tools.getDeps( module.factory ) );
			}
			return module.deps || [];
		},
		/**
		 * 判断是否在当前依赖列表中
		 */
		isInActive : function(){
			return this.moduleID in this.active;
		},
		/**
		 * "执行"并且"创建"依赖列表
		 */
		run : function(){
			if( this.isDone() ) return this;
			var deps = this.depend();
			//过滤短连接和自定义路径
			each( deps, function( index, value ){
				//创建激活列表
				this[ value.realMI() ] = true;
			}, this.active );
			debug( '%c检索模块依赖 -> ' + this.moduleID+' : [' + deps+ '] \r\n', 'color:#070' );
			//添加依赖去依赖列队
			EMPTY_ARRAY_PUSH.apply( _TaskKeys, deps );

			this.stack();
			return flush(), this;
		},
		done : function(){
			return ( this.loaded = true ), this;
		},
		//判断该会话是否已完成
		isDone : function(){
			return this.loaded;
		},
		/**
		 * 判断当前会话是否存在于仓库当中
		 */
		isInStorage : function(){
			return this.moduleID in this.storage;
		},
		/**
		 * 检索该会话依赖
		 * 后期得深层遍历依赖关系
		 */
		isReady : function(){
			//获取依赖列表
			var deps = this.data().deps, i = deps.length, dep;
			for( ; dep = deps[ --i ]; ){
				//判断依赖是否已存在
				if( com.isInStorage( dep ) ) continue;
				debug( '%c所依赖的模块['+ dep +'] [未加载完成]', 'color:#777' )
				return false
			}
			return true;
		},
		require : require
	} )
    /**
     * 声明一个模块 内部使用
     */
    function declareModule( id, module ){
    	new Module( id, module );
    	module.id = id;
		new Task( 'declare', module ).done();
    }
	/**
	 * 类型判断方法
	 * @param  {Object}  type 类型
	 * @return {Function} 返回判断参数类型的方法
	 */
	function is( type_ ){
		if( typeof type_ == 'string' ){
			var mark = new RegExp( '^\\[object '+ type_ +'\\]$' );
			return function( O ){
				return mark.test( EMPTY_OBJECT.toString.call( O ) );
			}
		} else {
			return function( O ){
				return O instanceof type_;
			}
		}
	}
	//创建类型判断
	var isRoot 			= is( 'Object' ),
		isFunction 		= is( 'Function' ),
		isArray 		= is( 'Array' ),
		isString 		= is( 'String' ),
		isRegExp 		= is( RegExp ),
		isTask 			= is( Task ),
		isSimplyType 	= is( '(?:Number|Boolean|Null|String|Undefined)' ),
		isObject 		= function( O ){ return O && isRoot( O ); },
		//isStringOrArray 	= is( '(?:Array|String)' ),
		isStringNotArray 	= is( '(?:(?!Array)|String)' );
	/**
	 * 获取当前运行的JS文件对象
	 * @return {Script}
	 */
	function self() {
		//获取当前加载脚本对象 高级浏览器
		if( document.currentScript ) {
			return document.currentScript;
		}
		var eStack, i, node, nodes = getTags( STRING_SCRIPT/*, HEAD*/ ), E;
		try {
			___I__Will__Error_____();
		} catch( e ) {
			E = e;
			eStack = e.stack;
		}
		if( eStack ) {
			//只能获取第一次进入时的错误堆栈,进入方法体内部时不能正确获取正确的堆栈
			eStack = eStack.replace( ERR_STACK_REG, $1 );
			node = Qma.getScriptByUri( eStack, nodes );
			if( node ) return node;
		}
		//IE
		for( i = 0; node = nodes[ i++ ]; ) {
		  	if( node.readyState === 'interactive' ) {
				return node;
		  	}
		}
		//这里处理webkit/534 和 Firefox 4.0 以下版本的当前加载问题
		return Qma.getScriptByUri( Qma.currentLoad || E.sourceURL, nodes );
	}
	/**
	 * 实现继承扩展 merge( O1, O2, O3[,...], data# 要扩展数据 #, cover# 是否覆盖添加 # )
	 */
	function merge( s, o, e, i ) {
		var key, cover, data, source, args;
		/* 格式化参数 */
		args 	= EMPTY_ARRAY_SLICE.call( arguments );
		/*获取最后一位*/
		cover 	= args.pop();
		/* 归位 */
		args.push( cover );
		/*是否是boolean类型*/
		if( !/false|true/ig.test( cover ) ) {
			//默认不替换
			args.push( false );
		}
		cover 	= args.pop();
		data 	= args.pop();
		while( source = args.shift() ){
			for ( key in data ) {
				if ( cover || !( source.hasOwnProperty && source.hasOwnProperty( key ) ) ) {
					source[ key ] = data[ key ];
				}
			}
		}
	};
	/**
	 * 声明变量
	 * @param  {String} path    声明的深度
	 * @param  {Object} data    声明的变量指向的值
	 * @param  {Object} context 依附对象
	 */
	function declare( path, data, context ){
		context = context || this;
		var paths = path.split( '.' );
		var i = 0;
		while( path = paths[ i++ ] ){
			if( path in context ){
				context = context[ path ];
				if( isSimplyType( context ) ){
					 debug( '%c'+path + ' \'s type not Object! need Object {} ', 'color:red' ) ;
					 break;
				} else continue;
			}
			context = context[ path ] = {};
		}
		merge( context, data );
		return context
	}
	/**
	 * 昵称
	 */
 	declare( 'alias', { }, Qma );
 	/**
 	 * 模块类型
 	 */
 	declare( 'suffixs', { }, Qma );

	/**
 	 * 模块类型
 	 */
 	declare( 'pick', { }, Qma );

 	/**
 	 * 对象遍历使用
 	 * @see each();
 	 * @type {Object}
 	 */
	com.factory = {
		/**
		 * 处理数组
		 * @param  {Array}   source 参数参见  com.each
		 * @param  {Function} fn     参数参见  com.each
		 * @param  {Number}   key    代理参数
		 * @param  {Number}   length 代理参数
		 */
		array : function( source, fn, key, length ){
			key = 0; length = source.length >> 0;
			for( ; key < length && ! fn.call( this, key, source[ key ], source ); key++ );
		},
		object : function( source, fn, key ){
			for( key in source ){
				if( fn.call( this, key, source[ key ], source ) ) break;
			}
		},
		push 	: function( data, key, value ){
			return data.push( value )
		},
		add 	: function( data, key, value ){
			data[ key ] = value;
		}
	}
	/**
	* 遍历
	* @param  {Array|Object}   source 数据源
	* @param  {Function} func    处理方法
	* @param  {Object} context 处理方法的运行环境 如果为空 func内的this将指向window
	*/
	function each( source, func, context ){
		if( ! isFunction( func ) ) return;
		//挑选处理方方法
		com.factory[ isArray( source ) ? STRING_ARRAY : STRING_OBJECT ].call( context, source, func );
	}

	/**
	 * 工具类
	 */
	function Util(){};
	//创建工具类
	var tools = new Util();
	/**
	 * 处理声明function
	 * @type {Object}
	 */
	var _async_require_map = {
		SEP 				: '{@}',
		START				: '{%}',
		LEFT				: '{',
		RIGHT				: '}',
		map 				: {},
		NUM 				: 1E6,
		_has_async_func_ 	:     /(?:require|\w+)\s*\([^),]*/,
		_async_fx__			: /(?:((?:require|\w+)\s*\([^),]*,[^(]*\([^)]*\)\s*(?:=>)?\s*\{)|(\{)|(\}))/g,
		REPLACE 			: function( num ){
			return this.map[ num ] || (this.map[ num ] = new RegExp( '\\' + this.START + num + '(?:(?!\\' + this.SEP + num + ').|\\n)*\\' + this.SEP + num));
		}
	};

	var moduleIDs = {}
	/**
	 * 工具原型注册方法
	 * @type {Util}
	 */
	merge( Util.prototype, {
		//ANNOTATION_REG: /(?:(\/\*(?:[^*]*|(?:(?!\*\/).)*)\*\/)|(?:[^\/'":]\/\/.*$))/gm,
		//匹配注释 修改了\/\/匹配的问题 http://影响混淆
		ANNOTATION_REG  : /(?:(\/\*+(?:[^*]|\*[^\/])*\*\/))|(?:([^\/'":])\/\/.*$)[\r\n]*/gm,
		/**
		 * 执行Function
		 * @param  {Function} 要执行的方法
		 * @param  {arguments...} 方法对应的参数
		 * @return {Object} 返回方法执行结果
		 */
		runFx : function( callback, G ){
			var args = EMPTY_ARRAY_SLICE.call( arguments );
			var fx = args.shift();
			if( fx instanceof Function ){
				return fx.apply( this, args );
			}
		},
		/**
		 * 获取依赖
		 */
		getDeps : function( factory ) {
			var fx = factory.toString();
			//去掉注释
			fx = fx.replace( this.ANNOTATION_REG,  EMPTY_STRING );
			//判断是否含有异步调用
			_async_require_map._has_async_func_.test( fx ) &&
			//排除异步加载
			( fx = this.removeAsyncRequire( fx ) );
			//处理方法的运行环境
			var context = {
				mark 	: com.pull( fx, factory ),//获取匹配的正则
				pick 	: [],
				map 	: com.requireIDs
			};
			each(
				//数据源
				fx.match( context.mark ) || [],
				//处理方法
				function( key, value ){
					value = value.replace( this.mark, $1$2 );
					if( value in this.map ) return;//去重

					this.map[ value ] = true;
					this.pick.push( value );
				},
				context
			);
			return context.pick;
		},
		removeAsyncRequire : function( fx ){
			var 
				l		= _async_require_map.LEFT,
				r		= _async_require_map.RIGHT,
				sep		= _async_require_map.SEP,
				start	= _async_require_map.START;
			var 
				mark 	= false,
				block 	= 0,
				cMark 	= _async_require_map.NUM;

			fx = fx.replace( _async_require_map._async_fx__, 
				/**
				 * 匹配异步模块加载并替换
				 * @param  {String} pick 通配符
				 * @param  {String} $1   异步开始
				 */
				function( pick, $1 ){
					if( $1 ){
						cMark = 1;
						block++;
						mark = true;
						return start;
					}
					if( mark ){
						pick == l && cMark++;
						pick == r && cMark--;
						if( cMark == 0 ){
							mark = false;
							cMark = _async_require_map.NUM;
							return sep;
						}					
					}

				return EMPTY_STRING;
			} );
			while( fx.indexOf( start ) != -1 && block-- ){
				fx = fx.replace( _async_require_map.REPLACE( EMPTY_STRING ), EMPTY_STRING );
			}
			return fx;
		},
		/**
		 * 检索数据类型
		 * tools.checkByType( [ 'String', Array ], [ id, [xxx] ], [默认值] )
		 * checkByType(
		 * 		[ Number, Function, String, 'String' ],
		 * 		[ function(){alert(1)}, new String(), '' ]
		 * )
		 * [undefined, function (){alert(1)}, "", ""]
		 */
		checkByType : function( types, source, defaultData ){
			if( ! isArray( source ) ) return ret;
			defaultData || ( defaultData = [] );
			var ret = [], i = 0, len = types.length, data;
			while( ( data = source.shift() ) || i < len ){
				//类型正确
				if( is( types[ i ] )( data ) ){
					ret.push( data );
				} else {
					//类型不一样但有值
					if( data ){
						source.unshift( data );
					}
					//添加默认值
					ret.push( defaultData[ i ] );
				}
				i++;
			}
			return ret;
		},
		/**
		 * 筛选数据
		 * @param  {Object} data 原始数据
		 * @param  {Array}  pick 要筛选的key集合
		 * @param  {Array}  type 返回的类型   {} || []
		 * @return {Object}      筛选后的数据 依赖于参数@see #type
		 */
		pick : function( data, pick, type ){
			if( ! isArray( pick ) ) return data;
			var isIn, __data_ = type || {};
			var fn = com.factory[ isArray( type )? 'push' : 'add' ];
			each( pick,
				function( key, value ){
					isIn = value in data;
					if( ! isIn ) return;
					this.fx( this.box, value, data[ value ] );
				},
				{ box : __data_, fx : fn }
			);
			return __data_;
		},
		/**
		 * 转数组
		 * @param  {Object} data 数据源
		 * @return {Array}
		 */
		toArray : function( data ){
		 	return EMPTY_ARRAY_SLICE.call( data );
		},
		merge : merge

	} )

	//获取当前文件
	_SELF = self();

	/**
	 * 模块加载的配置属性
	 * @type {Object}
	 */
	tools.config = {
		'JS' 	: '.js',
		'CSS' 	: '.css',
		'.js' 	: STRING_SCRIPT,
		'.css'	: 'link',
		data 	: {
			link : { 'type' : 'text/css', 'rel' : 'stylesheet' }
		},
		src 	: { link 	: 'href', script 	: 'src' },
		info : function( err ){
			return debug('%cError: at [' + err + '] Modules do not exist or load timed out!');
		}
	}
	/**
	 * 模版加载器
	 * 照方抓药
	 */
	function ModuleWorker( data, callback, args ){
		//如果参数为空为非真值当前赋值data
		args || ( args = data );
 		//获取标签对象
 		var Tag 	= createByTagName( data.type );
 		//添加标签属性
 		each( data.attr, function( key, value ){
 			this.setAttribute( key, value );
 		}, Tag );
 		//回调参数
 		this.argument = [ Tag, callback, args ];
		//增加监控事件
		this.onload( data.isScript ).onerror( Tag );

		//添加对象
		HEAD.appendChild( Tag );
		debug( '%c正在加载模块 -> ' + data.uri, 'color:#e0e'  );
	}

	merge( ModuleWorker.prototype, {
		/**
		 * 添加加载文件的成功回调事件
		 * @param  {Boolean}  isScript 是否为脚本
		 */
		onload : function( isScript ){
			//低版本样式加载的onload不能回调处理
			return this[ IS_LONG_LONG_AGO && ! isScript ? 'load' : 'moduleLoad' ].apply( this, this.argument ), this;
		},
		/**
		 * 加载异常处理
		 */
		onerror : function( Tag ){
			var self = this;
			Tag.onerror = function(){
				self.task && self.task.space();
				var arg = self.argument[2];
				com.cleanLoadingMark(arg.uri);
				tools.runFx(require.error || define.error || tools.config.info, arg);
				Tag.parentNode.removeChild(Tag);
			}
			return this;
		},
		/**
		 * 低版本样式加载的onload不能回调处理
		 */
		load : function( Tag, callback, args ){
			var times 	= 0;
			var self 	= this;
			debug( '进入低版本样式加载模式 > ', Tag.href, 'color:#9bd807' );
			//每步回调100毫秒
			var step 	= 100;
			//15秒超时, 直接设置成功回调
			var max 	= 15 * 1000;
			(function run(){
				if( Tag.sheet || times > max ) return callback.call( self, args );
				times += step;
				setTimeout( run, step );
			}())
		},
		/**
		 * JS加载事件
		 * @type {Function}
		 */
		moduleLoad : 'onreadystatechange' in _SELF ?
			// ie
			function( Tag, callback, args ){
				var self = this;
				Tag.onreadystatechange = function( e ){
					if( /^(?:complete|loaded)$/.test( this.readyState ) ){
						tools.runFx.call( self, callback, args );
					}
				}
			}
			://chrome|firefox|...
			function( Tag, callback, args ){
				var self = this;
				Tag.onload = function( e ){
					tools.runFx.call( self, callback, args );
				}
			}
	} )

	/**
	 * 模块工厂
	 * @param  {String} id 模块ID
	 * @return {Object}    模块对象
	 */
	function moduleFactory( id ){
		id = com.toRealMI( id );
		var task;
		if( task = com.isInModules( id ) ) return task;
		if( task = com.isInStorage( id ) ){
			//创建模块对象
			var _Mo = new Module( id, {} ),
				_ret,
				module = task.data();
			debug( '%c正在创建模块 : ' + id, 'color:blue' );
			_ret = module.length ?
			//创建AMD对象
			com.factory.require( task )
			:
			//创建CMD对象
			module.factory.apply( task, [ require, _Mo.exports, _Mo, id ] );

			if( isFunction( _ret ) ){
				_Mo.exports = _ret;
			} else {
				//如果含有返回值则附加到对象
				merge( _Mo.exports, _ret );
			}
			//重新设置关系
			_Mo.rebulid();
			//第三方模块运行任务
			//task.wake();
			task.done();
			return _Mo.exports;
		}
	}
	/**
	 * 异步加载
	 * @param  {String} id  依赖ID
	 * @param  {Function} func 异步回调
	 */
	require.async = function( uri, func ){
		isString( uri ) && ( uri = [ uri.realMI() ] );
		var len 	= uri.length,
			//返回新会话对应的module
			task 	= new Task( REQUIRE_NAME, {
				//计算ID 创建索引使用
				id 		: isString( this ) ? this : REQUIRE_NAME + +new Date,
				//依赖列表 包括本身
				deps 	: uri,
				//参数长度
				length 	: len,
				//声明回调方法
				factory : func
			} );
		isFunction( func ) && ( func.cmd = false );
		task.async = !!len;
		//计算所依赖的模块状态
		while( len-- && com.isInModules( uri[ len ] ) );
		//判断依赖是否已全部加载完成,如果加载完成直接创建当前,否则进列队排队等候
		len < 0 ? com.factory.require( task ) : task.run();
	}
	require.use = require.async;
	/**
	 * 通过uri获取模块对象
	 * @param  {String} 模块ID
	 * @param  {Function} 模块体 用户定义模块   该方法需要参数( ID对应的依赖列表 )
	 * @return {Object} 模块体对应的参数 exports
	 */
	function require( id, factory ){
		//判断是否是CMD调用
		if( isStringNotArray( id ) && factory === undefined ){
			return moduleFactory( id );
		}
		//判断是否为AMD调用
		if( isFunction( id ) ){
			factory = id;
			id 		= [];
		}
		//如果是重复调用会多次创建
		return require.async( id, factory );
	};

	/**
	 * define(id?, deps?, factory)
	 * 模块声明
	 */
	function define( id, deps, factory ){
		var //获取模块ID
			name = isString( this ) ? this + EMPTY_STRING : com.pickMI(),
			mark = 0,
			task;
		//创建单纯对象
		if( isObject( id ) || isObject( deps ) && ++mark ){
			if( ! mark ) {
				deps 	= id;
				id 		= name;
			}
			id = com.moduleId( id, name );
			//创建模块会话
			return new Task( DEFINE_NAME,  new Module( id, deps ) ).done();
		}
		//格式化参数
		var tank = tools.checkByType(
			DEFINE_TYPES,
			[ id, deps, factory ], 		//要检索的数据
			[ name, [], function(){} ] //默认数据 如果不写.默认 undfined
		);
		//重新建立关系
		id 			= tank[ 0 ];
		deps 		= tank[ 1 ];
		factory 	= tank[ 2 ];
		//含有依赖时按照AMD模式处理
		factory.cmd = ! deps.length;
		var moduleID = com.moduleId( id, name );

		if( ! ( task = com.isInStorage( moduleID ) ) ){
			task = new Task( DEFINE_NAME, { id : moduleID, deps : deps, factory : factory, length : deps.length, alias : id } );
		}
		//判断当前define是否已被依赖,如果是进列队否则休眠
		if( task.isInActive() ) task.run();
	}
	/**
	 * 执行列队
	 * @param  {Array} 依赖列队
	 */
	function flush( rank ){
		_CallModule( rank || _TaskKeys, function( ){
			var //任务
				task, isNotReadyList = [], Map = {};
			//获取任务列表
			while( task = tasks.pop() ){
				//判断是否已存在仓库
				if( ! isTask( task ) || task.isDone() || ! task.isInStorage() ) continue;
				//判断会话列队中是否有重复
				if( task.module.factory in Map ) continue;
				Map[ task.module.factory ] = 0;
				/**
				 * 获取依赖是否已加载完毕
				 */
				if( ! task.isReady() ){
					isNotReadyList.push( task );
					if( task.id == DEFINE_NAME ) break;
					else continue;
				}
				/**之后的代码是可以执行了依赖已加载完毕**/
				tools.runFx( com.factory[ task.id ], task );
				task.done();
			}
			EMPTY_ARRAY_PUSH.apply( tasks, isNotReadyList );
		});
	}
	/**
	 * 处理define和require声明的处理方法
	 * 调用在依赖已加载完毕时
	 */
	declare( 'factory', {
		/**
		 * 处理require声明 AMD回调参数填充和调用
		 * @param  {Task} task 任务会话
		 */
		require : function( task ){
			var module = task.data(), args = module.deps.slice( 0, module.length );
			/* 获取参数列表 */
			each( args, function( index, dep ){
				this[ index ] = moduleFactory( dep );
			}, args );
			args.unshift( module.factory );
			/* 执行回调函数 */
			return tools.runFx.apply( task.remove(), args );
		}
	}, com );
	/**
	 * 呼唤模块
	 * @param  {Array}   deps
	 * @param  {Function} callback
	 */
	function _CallModule( deps, callback ){
		//判断是否只支持单请求
		if( Qma.isSimplyLoad ){
			return;
		}
		if( ! deps.length ) {
			debug( '%c依赖列队加载完毕', 'color:#3e3' );
			return tools.runFx( callback );
		};
		var key 	= deps.shift(),
			task;
		debug( '%c准备加载模块 -> ' + key, 'color:#666' );
		if ( task = com.isInStorage( key ) ) {
			task.run();
		} else {
			//判断是否在加载列表中
			if( com.isInLoading( key ) ) return debug( '%c已在加载列表 -> ' + key, 'color:#e06'  );

			var data = com.uri.get( key );
 			//设置当前加载模块
 			Qma.currentLoad = data.uri;
			//开启单加载模式
			IS_LONG_LONG_AGO && ( Qma.isSimplyLoad = true );
			/* 加载模块 */
			new ModuleWorker( data, function( data ){
				debug('该标签 : ',data.type,'.sheet = ',!!this.argument[0].sheet , ' : ', data.uri, 'color:red' );
				if( data.isScript ){
					var s = this.argument[ 0 ];
					s.parentNode.removeChild( s );
				}
				//加载完毕后关闭之前设置的状态,通用
				Qma.isSimplyLoad = false;
				var uri = data.uri;

				/* 是否有相关CMD|AMD配置, 使非模块化的模块化 */
				if( uri in _depends ){
					var mods = _depends[ uri ] || [],
						name = mods.exports;
					if( name ){
						define.call( uri, mods.deps, function( ){
							return global[ name ];
						})
					}
				}
				//非AMD CMD 模块加载
				! com.isInStorage( uri ) && define.call( uri, {} );
				/* 刷新列表 */
				flush();
			} );
		}
		_CallModule( deps, callback );
	}
	/**
	 * uri opt
	 * @type {Object}
	 */
	declare( 'uri', {
		/* 匹配后缀名 目前支持 js | css(后不含有?或者#) '|css[^#?]' */
		DOT_EXTNAME 	: /\.(js(?=$|#))/,
		HAS_EXT			: /(?:(\.(?:css|js))|(.))(\?|\#|$)/,
		/* 匹配 [dir/../] or [/.] */
		DOT 			: /(?:[^\/]*\/[^\/]*\.{2}\/|\/\.(?!\.))/,
		/**
		 * 获取模块配置信息
		 * @param  {String} uri 模块ID
		 * @return {JSON}     配置信息
		 */
		get : function( uri ){
			var isMark = Qma.suffixs[ uri ];
			if( ! isMark ){
				//获取文件路径,只针对JS,其中包含了寄生类   xxxxx#oooooo
				uri = uri.split( INNER_CLASS_SEP )[ 0 ];
			}
			//获取后缀
			var suffix = this.extname( uri ).toLowerCase();
			//获取带后缀的连接地址
			var path = this.path( /^(?:http[s]?|file)\:/.test( uri ) ? uri : uri.realMI(), suffix );
			var data = {
				uri 	: uri,
	 			//获取标签类型
				type 	: tools.config[ suffix ] || STRING_SCRIPT,
				//设置url所指的对象属性
				attr 	: { async : true/**/ },
				//请求后缀名
				suffix 	: suffix || EMPTY_STRING
			};

	 		//是否为script请求
	 		data.isScript = data.type == STRING_SCRIPT/* || suffix == tools.config.JS*/;
			//设置模版短连接
	 		data.attr[ MODULE_NAME ]			= data.uri;
	 		//设置模版地址
	 		data.attr[ tools.config.src[ data.type ] ] 	= path;

	 		merge( data.attr, tools.config.data[ data.type ] );

			return data;
		},
		/**
		 * 处理URI路径
		 * @param  {String} url 要处理的URL
		 * @return {String}     处理后的
		 */
		real : function( url ){
			/* 是否含有点 */
			if( this.DOT.test( url ) ){
				/* CONTEXT_PATH 是页面执行 */
				url = CONTEXT_PATH + url;
				while( this.DOT.test( url ) ){
					url = url.replace( this.DOT, EMPTY_STRING )
				}
			}
			return url.replace( this.DOT_EXTNAME, EMPTY_STRING );
		},
		/**
		 * 获取对象文件的后缀名
		 * @param  {String} uri 模块ID
		 * @return {String}    	后缀
		 */
		extname : function( uri ){
			var url 	= com.toRealMI( uri );
			var suffix 	= Qma.suffixs[ uri ];
			if( suffix === undefined ){
				this.HAS_EXT.test( url );
				suffix = RegExp.$1 in tools.config ? RegExp.$1 : tools.config.JS;
			}
			debug( url,'>', this.HAS_EXT.test( url ),' : |', suffix ,'|', 'color:#07afd8' )
			return  suffix;
		},
		/**
		 * 获取相应路径
		 * @param  {String} path 路径
		 * @param  {String} type 类型
		 * @return {String}
		 */
		path : function( path, type ){
			var sep = /\?|#/.test( path ) ? '&' : '?';
			path = path.replace( this.HAS_EXT, '$2' + type + '$3' );
			return path + ( version && ( sep + version ) ) || EMPTY_STRING;
		}
	}, com )

	merge( global, {
		declare 	: define,
		$define 	: define,
		define 		: define,

		require 	: require,
		$require 	: require,
		
		modules		: modules,
		$modules 	: modules,

		assert 		: declare
	}, !true );
	
	//声明require为内部模块
	declareModule( REQUIRE_NAME, require );
	//声明内部工具模块
	declareModule( '_tools__', tools.pick( tools, [ 'runFx', 'checkByType', 'pick' ] ) );

	define.toString = require.toString = function(){ return 'function(){[native code]}'}
	/*获取当前引用的配置属性*/
	mainJsPath = _SELF.getAttribute( STRING_MAIN );
	function auto(){
		/*判断是否有自执行*/
		if( mainJsPath ){
			require.async( mainJsPath );
		}
	}
	if( _SELF.innerHTML ){
		var innerModuleID = '__runjs.inner__';
		define.call( innerModuleID, new Function( 'require', 'exports', 'module', '__module_name', _SELF.innerHTML ) );
		require( innerModuleID, function(){
			auto();
			flush();
		} );
	} else {
		auto();
	}
	//调试
	global.DEBUG 		= global.DEBUG || false;
	global.appendChild 	= append;
	//输出流程
	function debug(){
		if( ! global.DEBUG ) return;
		echo.apply( global, EMPTY_ARRAY.slice.call( arguments ) );
	}
	var debugBox,
		CLR;
	//调试工具
	function append(){
		var html = EMPTY_ARRAY_SLICE.call( arguments ).join('');
		//创建调试工具容器
		if( ! debugBox ){
			debugBox 		= document.createElement( 'div' );
			debugBox.id 	= 'debugBox';
			document.body.appendChild( debugBox );
		}
		CLR || (CLR = /(?:^\%c|color\:(.*)$)/g);
		var apps 			= document.createElement( 'div' );
		var htmlR 			= html.replace( CLR, EMPTY_STRING );
		(htmlR != html) && ( apps.style.color 	= RegExp.$1 );
		apps.innerHTML 		= htmlR;
		debugBox.appendChild( apps );
		apps.setAttribute( 'debug', 'true' );
		debugBox.scrollTop += apps.offsetHeight + 10;
	}
	function echo(){
		try{
			var log = Array.apply( null, arguments );
			//throw ''
			console.log.apply( console , log );
		} catch ( e ){
			try{append( EMPTY_ARRAY_SLICE.call( arguments ).join( '\r\n\r\n' ) );}catch(e){}
		}
	};

}( window ))