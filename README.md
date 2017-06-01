runJs
=========
配置信息
------
```javascript
//配置信息 写在<script></script>块中 _Qma为全局变量
var _Qma = {
      //时间戳
      v 	: ( +new Date / ( 1000 ) ) >> 0,
      //短连接 require(name)中的name
      alias	: {
      	'main' 			: 'script/test',
      	'query' 			: 'script/query',
      	'menu.show' 	: 'css/menu.show',
      	'mode' 			: 'script/mode'
      },
      //配置模块类型, .js or .css 默认.js
      types : {
      		'menu.show' 		: '.css'
      },
      //添加依赖 非CMD 和 AMD 对象的支持
      depends : {
          query : {
              //支持全局变量对象
              exports 	: 'Qma'
          },
          notice : {
              //添加样式和JS模块的依赖
              deps : [ 'mode', 'query','/runjs/css/notice.css' ]
          }
      }
}
```
HTML中的调用
-------
```html
<!--第一种使用-->
<script type="text/javascript" src="runjs.js" main="main" ></script>
```
```html
<!--第二种使用-->
<script type="text/javascript" src="runjs.js" main="script/test" ></script>
```
```html
<!--第三种使用-->
<script type="text/javascript" src="runjs.js">
	require.use( 'main' );
</script>
```



