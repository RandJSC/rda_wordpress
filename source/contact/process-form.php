<?php


//If the form is submitted
if(isset($_POST['send'])) {
  
	$email= '';
	$message = '';

	$contactName = stripslashes(trim($_POST['inputName']));
	$subject = stripslashes(trim($_POST['inputSubject']));
	if(!$subject) $subject = 'No Subject';
	//If there is no error, send the email
	if(!isset($hasError)) {
		if(trim($_POST['inputName']) === '') {
			$nameError = 'You forgot to enter your name.';
			$hasError = true;
		} 
		else {
			$contactName = trim($_POST['inputName']);
		}
		
		//Check to make sure sure that a valid 
		//address is submitted
		if(trim($_POST['inputEmail']) === '')  {
			$emailError = 'You forgot to enter your email address.';
			$hasError = true;
		} else if (!preg_match("/^[_\.0-9a-zA-Z-]+@([0-9a-zA-Z][0-9a-zA-Z-]+\.)+[a-zA-Z]{2,6}$/i", trim($_POST['inputEmail']))) {
            $emailError = 'You entered an invalid email address.';
            $hasError = true;
		} else {
			$email = trim($_POST['inputEmail']);
		}
		 
		//Check to make sure comments were entered 
		if(trim($_POST['inputMessage']) === '') {
			$messageError = 'You forgot to enter your message.';
			$hasError = true;
		} 
		else {
			if(function_exists('stripslashes')) {
		  		$message = stripslashes(trim($_POST['inputMessage']));
		 	} 
		 	else {
		  		$message = trim($_POST['inputMessage']);
			}
		}
	}
	if(!isset($hasError)) {
		
		$status = "";
		
		require_once "class.phpmailer.php";
		$mail = new PHPMailer();
		$mail->IsMail();
		$mail->IsHTML(true);    
		$mail->CharSet  = "utf-8";
		$mail->From     = $email;
		$mail->FromName = $contactName;
		$mail->WordWrap = 50;    
		$mail->Subject  =  $subject;
		$mail->Body     =  "<strong>Full Name:</strong> " . $contactName. ".<br/>";
		$mail->Body     .= "<strong>Message:</strong> " . $message. ".";
		$mail->AddAddress('email@domain.com');
		$mail->AddReplyTo($email);
		
		if(!$mail->Send()) {  // send e-mail
			$status =  '<div class="alert alert-danger fade in">Failed to send your e-mail. Please check everything and try again.</div>';
		}
		else
		{
			$status =  '<div class="success fade-in">E-mail was sent successfully.</div>';
		}
		echo $status; die();
		
		
	}
	else 
	{
		die ("Something went wrong, please check all the settings.");
	}	

	die;
} 
?>