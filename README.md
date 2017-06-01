<pre>
# runjs
<script type="text/javascript">
var _Qma = {
			v 		: ( +new Date / ( 1000 ) ) >> 0,
			alias 	: {
				main 			: 'script/test',
				'query' 			: 'script/query',
				'menu.show' 	: 'css/menu.show',

				'mode' 			: 'script/mode'

			},
			types : {
				'menu.show' 		: '.css'
			},
			depends : {
				query : {
					exports 	: 'Qma'
				},
				notice : {
					deps : [ 'listener', 'momery','/runjs/css/notice.css' ]
				},
				'lisa.test' : {
					deps :[
						'css/menu.show.css', 	//菜单
						'css/lisa.test.css', 	// 测试类样式
						'css/common.box.css'  //文件夹样式风格
					]
				},
				'picture.test' : {
					deps : [
						cssUri//'css/picture.common.box.css'  //文件夹样式风格
					]
				}
			}
		}
</script> 
<script type="text/javascript" src="runjs.js" main="main" >
	//require.use( 'main' );
</script>

</pre>
