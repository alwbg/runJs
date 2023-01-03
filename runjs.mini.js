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
 * Mix-time : 2023-01-03 11:19:28 午时
 */
!function(e){"use strict";var t,r,n,i=+new Date,o="define",a="object",u="array",c="",s="script",l="$1",d=[],f=Object.prototype,p=d.push,h=d.slice,g=["String",Array,Function],m=location.pathname.replace(/[^\/]*$/,c),y=navigator.userAgent,v=y.replace(/.*webkit\/([\d]+).*/i,l)<=534,M=y.replace(/.*firefox\/([\d\.]+).*/i,l)<9,k=v||M,_=/^\w*\(\s*([^\),\s]+)(?:=>)?/,x=/[\D\d]*(?:at|@).*((?:http(?:s|)|file)\:(?:\:(?!\d)|[^\:])*)(?:\:\d*){1,}(?:\)|\r|\n|)$/i,S="#",T=e._Qma||{},I=T.v||c,b=null,E=[],q=[],R={},A={},w={},D=T.depends||{},F={},N={};function iPickModuleUri(e,t){var r=e.split(S);return!0===t?r:r[0]}function getTags(e,t){return(t||document).getElementsByTagName(e)}w.requireIDs={},merge(N,T.alias),T.comp=function(e,t){return e.getAttribute("deps-name")==(t=iPickModuleUri(t))||t==e.src},T.tmp={getAttribute:function(){return location.host}},T.getScriptByUri=function(e,t){for(var n,i=t.length;(n=t[--i])&&(r==n||!this.comp(n,e)););return n||this.tmp},w.moduleStorage={},w.toRealMI=function(e){if(e in F)return F[e];for(var t,r,n,i=e,o=10,a=iPickModuleUri(e);(i=iPickModuleUri(i,!0))&&(r=i[0],n=i[1],i=(t=N[r]||r)+(n=n?S+n:c),t!=r&&a!=r&&!o--););return debug("%c[MNC]:%c",e,"%c -> ",i,"color:#aaa","color:#888","color:#555"),i=w.uri.real(i||e),F[e]=i,i},w.isInStorage=function(e){return w.moduleStorage[e.realMI()]},w.isInLoading=function(e){return function iRealName(e,t,r){var n=e.realMI();return J.runFx(t,iPickModuleUri(n),n,r)}(e,function(e,t,r){var n=r[t]||r[e];return r[t]=r[e]=t,!!n},A)},w.cleanLoadingMark=function(e){delete A[e.realMI()]},w.iGetCurrentModuleName=function(){var e=self().getAttribute("deps-name");return function iGetRealModuleName(e,t,r){var n=e.realMI();return n!=e&&n.indexOf(S)>-1&&J.runFx(t,iPickModuleUri(n),n,r)}(e,function(e){return e})||e},w.moduleIdRMap={},w.moduleId=function(e,t){return e==t&&this.uri.THR.test(e)?t:((this.moduleIdRMap[e]||(this.moduleIdRMap[e]=new RegExp(e+"(?:$|\\.js)","i"))).test(t)||(t=t+S+e),t=(t||e).realMI(),N[e]?t:N[e]=t)},w.isInModules=function(e){return R[e]},w.pull=function(e,t){var r,n=t.cmd&&_.test(e)&&(r=RegExp.$1)&&"require"!=r?"|"+RegExp.$1:c;return new RegExp("[^a-z](?:require"+n+")\\s*\\(\\s*(?:'([^']+)'|\"([^\"]+)\")\\s*\\)","ig")},String.prototype.has=function(e){return C(e)&&(e=this.indexOf(e)>-1),j(e)&&(e=e.test(this)),e},String.prototype.realMI=function(){return w.toRealMI(this)};getTags(s);var $=getTags("head")[0];function Module(e,t){this.id=e,this.exports=t,R[e]=t}function Task(e,t){this.id=e,this.module=t,this.moduleID=t.id,this.wake()}function declareModule(e,t){new Module(e,t),t.id=e,new Task("declare",t).done()}function is(e){if("string"==typeof e){var t=new RegExp("^\\[object "+e+"\\]$");return function(e){return t.test(f.toString.call(e))}}return function(t){return t instanceof e}}Module.prototype.rebulid=function(){return R[this.id]=this.exports,this},merge(Task.prototype,{active:{},storage:w.moduleStorage,echo:echo,each:each,tools:new Util,data:function(){return this.module},wake:function(){return this.storage[this.moduleID]=this,this},stack:function(){return E.push(this),this},clear:function(){return"require"==this.id&&delete this.storage[this.moduleID],this},space:function(){return delete R[this.moduleID],this.clear()},remove:function(){return each(this.module.deps,function(e,t){t=t.realMI(),delete this.active[t];var r=this.storage[t];r&&(r.space(),r.target&&r.target.parentNode&&r.target.parentNode.removeChild(r.target),delete this.storage[t])},this),this.clear()},depend:function(){var e=this.data();return e.alias in D&&p.apply(e.deps,(D[e.alias]||{}).deps||[]),L(e.factory)&&p.apply(e.deps,J.getDeps(e.factory)),e.deps||[]},isInActive:function(){return this.moduleID in this.active},run:function(){if(this.isDone())return this;var e=this.depend();return each(e,function(e,t){this[t.realMI()]=!0},this.active),debug("%c检索模块依赖 -> ",this.moduleID," : [",e,"]","color:#2196F3"),p.apply(q,e),this.stack(),flush(),this},done:function(){return this.loaded=!0,this},isDone:function(){return this.loaded},isInStorage:function(){return this.moduleID in this.storage},isReady:function(){for(var e,t=this.data().deps,r=t.length;e=t[--r];)if(!w.isInStorage(e))return debug("%c所依赖的模块[",e,"] [未加载完成]","color:#777"),!1;return!0},require:require});var U=is("Object"),L=is("Function"),O=is("Array"),C=is("String"),j=is(RegExp),B=is(Task),P=is("(?:Number|Boolean|Null|String|Undefined)"),H=function(e){return e&&U(e)},G=is("(?:(?!Array)|String)");function self(){if(document.currentScript)return document.currentScript;var e,t,r,n,i=getTags(s);try{___I__Will__Error_____()}catch(o){n=o,e=o.stack}if(e&&(e=e.replace(x,l),r=T.getScriptByUri(e,i)))return r;for(t=0;r=i[t++];)if("interactive"===r.readyState)return r;return T.getScriptByUri(T.currentLoad||n.sourceURL,i)}function merge(e,t,r,n){var i,o,a,u,c;for(o=(c=h.call(arguments)).pop(),c.push(o),/false|true/gi.test(o)||c.push(!1),o=c.pop(),a=c.pop();u=c.shift();)for(i in a)!o&&u.hasOwnProperty&&u.hasOwnProperty(i)||(u[i]=a[i])}function declare(e,t,r){r=r||this;for(var n=e.split("."),i=0;e=n[i++];)if(e in r){if(r=r[e],P(r)){debug("%c",e," 's type not Object! need Object {} ","color:red");break}}else r=r[e]={};return merge(r,t),r}function each(e,t,r){L(t)&&w.factory[O(e)?u:a].call(r,e,t)}function Util(){}declare("alias",{},T),declare("suffixs",{},T),declare("pick",{},T),w.factory={array:function(e,t,r,n){for(r=0,n=e.length>>0;r<n&&!t.call(this,r,e[r],e);r++);},object:function(e,t,r){for(r in e)if(t.call(this,r,e[r],e))break},push:function(e,t,r){return e.push(r)},add:function(e,t,r){e[t]=r}},debug(y);var X,W,J=new Util,z={SEP:"{@}",START:"{%}",LEFT:"{",RIGHT:"}",map:{},NUM:1e6,_has_async_func_:/(?:require|\w+)\s*\([^),]*/,_async_fx__:/(?:((?:require|\w+)\s*\([^),]*,[^(]*\([^)]*\)\s*(?:=>)?\s*\{)|(\{)|(\}))/g,REPLACE:function(e){return this.map[e]||(this.map[e]=new RegExp("\\"+this.START+e+"(?:(?!\\"+this.SEP+e+").|\\n)*\\"+this.SEP+e))}};function ModuleWorker(e,t,r){r||(r=e);var n=function createByTagName(e){return document.createElement(e)}(e.type);each(e.attr,function(e,t){this.setAttribute(e,t)},n),this.argument={target:n,callback:t,data:r},this.onload(e.isScript).onerror(n),$.appendChild(n),debug("%c正在加载模块 -> ",e.uri,"color:#ff5722")}function moduleFactory(e){var t;if(e=e.realMI(),t=w.isInModules(e))return t;if(t=w.isInStorage(e)){var r,n=new Module(e,{}),i=t.data();debug("%c正在创建模块 : ",e,"color:#FFEB3B");try{r=i.length?w.factory.require(t):i.factory.apply(t,[require,n.exports,n,e])}catch(o){J.runFx(require.error||define.error||J.config.info,o)}return L(r)?n.exports=r:r&&function isEmpty(e){for(var t in e)if(e.hasOwnProperty(t))return!1;return!0}(n.exports)?n.exports=r:merge(n.exports,r),n.rebulid(),t.done(),n.exports}}function require(e,t){return G(e)&&t===n?moduleFactory(e):(L(e)&&(t=e,e=[]),require.async(e,t))}function define(e,t,r){var n,i=C(this)?this+c:w.iGetCurrentModuleName(),a=0;if(H(e)||H(t)&&++a)return a||(t=e,e=i),e=w.moduleId(e,i),new Task(o,new Module(e,t)).done();var u=J.checkByType(g,[e,t,r],[i,[],function(){}]);e=u[0],t=u[1],(r=u[2]).cmd=!t.length;var s=w.moduleId(e,i);(n=w.isInStorage(s))||(n=new Task(o,{id:s,deps:t,factory:r,length:t.length,alias:e})),n.isInActive()&&n.run()}function flush(t){!function _CallModule(t,r){if(T.isSimplyLoad)return;if(!t.length)return debug("%c依赖列队加载完毕! Create Time -> ",+new Date-i,"ms","color:#8BC34A"),J.runFx(r);var n,o=t.shift();debug("%c准备加载模块 -> ",o,"color:#4CAF50");if(n=w.isInStorage(o))n.run();else{var a=w.isInLoading(o);if(a)return debug("%c已在加载列表 -> ",o,"color:#e06");var u=w.uri.get(o);T.currentLoad=u.uri,k&&(T.isSimplyLoad=!0),new ModuleWorker(u,function(t){var r=this.argument.target;debug("%c标签:::",t.type,":{sheet:",!!r.sheet,"} => [",t.uri,"]","color:#E91E63"),t.isScript&&r.parentNode.removeChild(r),T.isSimplyLoad=!1;var n=t.uri;if(w.cleanLoadingMark(n),n in D){var i=D[n]||[],o=i.exports;o&&define.call(n,i.deps,function(){return e[o]})}!w.isInStorage(n)&&define.call(n,{}),w.moduleStorage[n]&&(w.moduleStorage[n].target=r),flush()})}_CallModule(t,r)}(t||q,function(){for(var e,t=[],r={};e=E.pop();)if(B(e)&&!e.isDone()&&!(e.module.factory in r))if(r[e.module.factory]=0,e.isReady())J.runFx(w.factory[e.id],e),e.done();else if(t.push(e),e.id==o)break;p.apply(E,t)})}function auto(){b&&require.async(b)}if(merge(Util.prototype,{ANNOTATION_REG:/(?:(\/\*+(?:[^*]|\*[^\/])*\*\/))|(?:([^\/'":])\/\/.*$)[\r\n]*/gm,runFx:function(e,t){var r=h.call(arguments),n=r.shift();if(n instanceof Function)return n.apply(this,r)},getDeps:function(e){var t=e.toString();t=t.replace(this.ANNOTATION_REG,c),z._has_async_func_.test(t)&&(t=this.removeAsyncRequire(t));var r={mark:w.pull(t,e),pick:[],map:w.requireIDs};return each(t.match(r.mark)||[],function(e,t){(t=t.replace(this.mark,"$1$2"))in this.map||(this.map[t]=!0,this.pick.push(t))},r),r.pick},removeAsyncRequire:function(e){var t=z.LEFT,r=z.RIGHT,n=z.SEP,i=z.START,o=!1,a=0,u=z.NUM;for(e=e.replace(z._async_fx__,function(e,s){return s?(u=1,a++,o=!0,i):o&&(e==t&&u++,e==r&&u--,0==u)?(o=!1,u=z.NUM,n):c});-1!=e.indexOf(i)&&a--;)e=e.replace(z.REPLACE(c),c);return e},checkByType:function(e,t,r){if(!O(t))return i;r||(r=[]);for(var n,i=[],o=0,a=e.length;(n=t.shift())||o<a;)is(e[o])(n)?i.push(n):(n&&t.unshift(n),i.push(r[o])),o++;return i},pick:function(e,t,r){if(!O(t))return e;var n=r||{};return each(t,function(t,r){r in e&&this.fx(this.box,r,e[r])},{box:n,fx:w.factory[O(r)?"push":"add"]}),n},toArray:function(e){return h.call(e)},merge:merge}),r=self(),J.config={JS:".js",CSS:".css",".js":s,".css":"link",data:{link:{type:"text/css",rel:"stylesheet"}},src:{link:"href",script:"src"},info:function(e){return debug("%cError: at [",e.stack||e.message||e,"] Modules do not exist or load timed out!")}},merge(ModuleWorker.prototype,{onload:function(e){return this[k&&!e?"load":"moduleLoad"](this.argument),this},onerror:function(e){var t=this;return e.onerror=function(){t.task&&t.task.space();var r=t.argument.data;w.cleanLoadingMark(r.uri),J.runFx(require.error||define.error||J.config.info,r),e.parentNode.removeChild(e)},this},load:function(e){var t=e.target,r=0,n=this;debug("进入低版本样式加载模式 > ",t.href,"color:#9bd807");!function run(){if(t.sheet||r>15e3)return J.runFx.call(n,e.callback,e.data);r+=100,setTimeout(run,100)}()},moduleLoad:"onreadystatechange"in r?function(e){var t=this;e.target.onreadystatechange=function(r){/^(?:complete|loaded)$/.test(this.readyState)&&J.runFx.call(t,e.callback,e.data)}}:function(e){var t=this;e.target.onload=function(r){J.runFx.call(t,e.callback,e.data)}}}),require.async=function(e,t){C(e)&&(e=[e.realMI()]);var r=e.length,n=new Task("require",{id:C(this)?this:"require"+ +new Date,deps:e,length:r,factory:t});for(L(t)&&(t.cmd=!1),n.async=!!r;r--&&w.isInModules(e[r]););r<0?w.factory.require(n):n.run()},require.use=require.async,declare("factory",{require:function(e){var t=e.data(),r=t.deps.slice(0,t.length);return each(r,function(e,t){this[e]=moduleFactory(t)},r),r.unshift(t.factory),J.runFx.apply(e.clear(),r)}},w),declare("uri",{DOT_EXTNAME:/\.(js(?=$|#))/,HAS_EXT:/(?:(\.(?:css|js))|(.))(\?|\#|$)/,DOT:/(?:[^\/]*\/[^\/]*\.{2}\/|\/\.(?!\.))/,THR:/\?(&?[^&]+=[^&]*)+$/,get:function(e){var t,r;T.suffixs[e]||(e=iPickModuleUri(e)),this.THR.test(e)?(t=e,r=J.config.JS):(r=this.extname(e).toLowerCase(),t=this.path(/^(?:http[s]?|file)\:/.test(e)?e:e.realMI(),r));var n={uri:e,type:J.config[r]||s,attr:{async:!0},suffix:r||c};return n.isScript=n.type==s,n.attr["deps-name"]=n.uri,n.attr[J.config.src[n.type]]=t,merge(n.attr,J.config.data[n.type]),n},real:function(e){if(this.DOT.test(e))for(e=m+e;this.DOT.test(e);)e=e.replace(this.DOT,c);return e.replace(this.DOT_EXTNAME,c)},extname:function(e){var t=e.realMI(),r=T.suffixs[e];return r===n&&(this.HAS_EXT.test(t),r=RegExp.$1 in J.config?RegExp.$1:J.config.JS),r},path:function(e,t){var r=/\?/.test(e)?"&":"?";return e.replace(this.HAS_EXT,"$2"+t+(I&&r+I||c)+"$3")}},w),merge(e,{declare:define,$define:define,define:define,require:require,$require:require,modules:R,$modules:R,assert:declare},!1),require.alias=function(e,t){N[e]=t},declareModule("require",require),declareModule("_tools__",J.pick(J,["runFx","checkByType","pick"])),define.toString=require.toString=function(){return"function(){[native code]}"},b=r.getAttribute("main"),r.innerHTML){define.call("__runjs.inner__",new Function("require","exports","module","__module_name",r.innerHTML)),require("__runjs.inner__",function(){auto(),flush()})}else auto();function debug(){if(e.DEBUG){t==n&&(t=0);var r=[[t++,"\t"]];each(d.slice.call(arguments),function(e,t){/^color:/.test(t)?this.push(t):this[0].push(t)},r),r[0]=r[0].join(c),echo.apply(e,r)}}function append(){var e=h.call(arguments).join("");X||((X=document.createElement("div")).id="debugBox",document.body.appendChild(X)),W||(W=/(?:^\%c|color\:(.*)$)/g);var t=document.createElement("div"),r=e.replace(W,c);r!=e&&(t.style.color=RegExp.$1),t.innerHTML=r,X.appendChild(t),t.setAttribute("debug","true"),X.scrollTop+=t.offsetHeight+10}function echo(){try{var e=Array.apply(null,arguments);console.log.apply(console,e)}catch(t){try{append(h.call(arguments).join("\r\n\r\n"))}catch(t){}}}e.DEBUG=e.DEBUG||!1,e.appendChild=append}(window);