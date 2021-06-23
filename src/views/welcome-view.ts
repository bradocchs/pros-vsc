import * as vscode from "vscode";

export function getWebviewContent(
  styleUri: vscode.Uri,
  imgHeaderPath: vscode.Uri,
  imgIconPath: vscode.Uri,
  imgActionPath: vscode.Uri,
  imgProjectProsPath: vscode.Uri
) {
  return `
	<!DOCTYPE html>
	<html lang="en">
	   <head>
		  <link href="${styleUri}" rel="stylesheet" />
		  <title>Welcome</title>
	   </head>
	   <body>
			 <header>
			 <a class="header__link" title="Learn more about PROS" href="https://pros.cs.purdue.edu/">
				 <div class="header__logo">
					 <img class="image__logo" src="${imgHeaderPath}" />
				 </div>
			 </a>
			 <p class="header__blurb">
			 	 <a class="bold" title="Open PROS on GitHub" href="https://github.com/purduesigbots/pros">Open Source</a>
				 C/C++ Development for <b>VEX V5</b> and <b>VEX Cortex</b>. PROS is a lightweight and 
				 fast alternative open source operating system for VEX EDR Microcontrollers. It features multitasking, 
				 low-level control, and Wiring compatible functions to harness the full power of the Cortex. 
				 PROS is built with developers in mind and with a focus on providing an environment for 
				 industry-applicable experience.
			 </p>
		     </header>
				<div class="body__container">
					<div class="body__content">
						<div class="body__intro">
							Welcome To <b>PROS</b>
						</div>
						<div class="body__new_versions">
							See what's new in <a>CLI (version)</a> and <a>Kernel (version)</a>
						</div>
						<div class="body__blurb">
							Primary maintenance of PROS is done by students at Purdue University through Purdue ACM SIGBots. Inspiration for this project came from several computer science and engineering students itching to write code for VEX U's extended autonomous period. We created PROS to leverage this opportunity. 	
						</div>
						<hr>
						<div class="body__settings">Settings (todo)</div>
						<hr>
						<div class="body__features">
							<div class="body__features_header">Features</div>
							<div class="body__features_img_left_one">Access all of the PROS commands you will need from the VSCode sidebar. Click on the PROS Icon on the sidebar for a list of common actions like Building, Uploading, Debugging, and Upgrading your project.</div>
							<div class="body__features_img_right_one"><img src="${imgIconPath}" /></div>
							<div class="body__features_img_left_two"><img src="${imgActionPath}" /></div>
							<div class="body__features_img_right_two">Quickly iterate with the PROS Quick Action button. This PROS Icon on the top right of the editor will build and upload your code.</div>
							<div class="body__features_img_left_three">Modify your project's settings easily with the project.pros custom editor. Opening the "project.pros" file at the root of your project will open this custom settings editor.</div>
							<div class="body__features_img_right_three"><img src="${imgProjectProsPath}" /></div>
						</div>
						<hr>
						<div class="body__help">
							For help, please visit:
							<ul>
								<li><a>This page</a> for a guide to getting started with PROS for VSCode</li>
								<li>The <a>PROS tutorial page</a> to learn about using everything from sensors to motors to tasks and multithreading in PROS.</li>
								<li>The <a>PROS API documentation</a></li>
							</ul>
						</div>
					</div>
				</div>
		  </div>
	   </body>
	</html>
	`;
}
