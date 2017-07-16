runJs[模块加载器]
=========
```javascript
/**
 * 模块加载器
 * @autor alwbg@163.com | soei
 *  ------------------------------------
 *  -  https://github.com/alwbg/runJs  -
 *  ------------------------------------
 * @Date 2015/4/23
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
 * creation-time : 2017-07-07 16:50:53 PM
 */

```
----
配置信息
------
```javascript
//配置信息 写在<script></script>块中 _Qma为全局变量
var _Qma = {
      //时间戳
      v     : ( +new Date / ( 1000 ) ) >> 0,
      //短连接 require(name)中的name
      alias : {
        //调度模块
        'main'          : 'script/main',
    //测试模块
    'test'          : 'script/test',
        'query'         : 'script/query',
        'menu.show'     : 'css/menu.show',
        'mode'          : 'script/mode'
      },
      //配置模块类型, .js or .css 默认.js
      types : {
            'menu.show'         : '.css'
      },
      //添加依赖 非CMD 和 AMD 对象的支持
      depends : {
          query : {
              //支持全局变量对象
              exports   : 'Qma'
          },
          notice : {
              //添加样式和JS模块的依赖
              deps : [ 'mode', 'query','/runjs/css/notice.css' ]
          }
      }
}
```
HTML中的启用入口 写在body标签结尾或者后
-------
```html
<!--第一种使用-->
<script type="text/javascript" src="runjs.js" main="main" ></script>
```
```html
<!--第二种使用-->
<script type="text/javascript" src="runjs.js" main="script/main" ></script>
```
```html
<!--第三种使用-->
<script type="text/javascript" src="runjs.js">
    require.use( 'main' );
</script>
```
模块声明 script/test
----
```javascript
//script/test.js
//define(id?, deps?, factory)
define(function( require, exports, module){
    exports.run = function(){
        console.log( '这是模块script/test#run被调用了' )
    }
    return {
        testlog : function(){
            console.log( 'test' )
        }
    }
})
```
入口函数及调用
------
```javascript
//script/main.js
//此处默认调用执行 CMD写法
define( function( require, exports, module ){
    var test = require( 'test' );
    require( 'menu.show' );//加载样式,对样式实施分块加载
    test.run();
    test.testlog();
})
//此处默认调用执行 AMD写法
define( ['test'], function( test ){
    test.run();
    test.testlog();
})
```
