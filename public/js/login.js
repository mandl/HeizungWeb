$(document).ready(function(){
	$(':text:first').focus();
	$('form').submit(function(e) {

		$.post("login",$('#mylogin').serialize());

	   });
});