import * as vscode from "vscode";
import * as path from 'path';
import * as os from 'os';
import { download } from './download';
import { getCurrentVersion, getCliVersion, getInstallPromptTitle } from "./installed";
import { makeTerminal, system } from '../extension'
import * as fs from 'fs';
import { promisify } from "util";
import internal = require("stream");
import { downloadDirToExecutablePath } from "vscode-test/out/util";
import { ProsProjectEditorProvider } from "../views/editor";
var fetch = require('node-fetch');

//TOOLCHAIN and CLI_EXEC_PATH are exported and used for running commands.
export var TOOLCHAIN: string;
export var CLI_EXEC_PATH: string;
export var PATH_SEP: string;

/*

Code that maybe works to wait for both toolchain and cli to be installed???
a and b arguments are arrays in the format:
{download_url, download_name, system_type}

async function downloadCli_and_toolchain(context:vscode.ExtensionContext,a:string[],b:string[]) {
download(context,a[0],a[1],a[2]);
await promisify(download)(context,b[0],b[1],b[2]);
return true;
}
*/

async function removeDirAsync(directory: string, begin: boolean) {
    // get all files in directory
    if (begin) {
        vscode.window.showInformationMessage("Clearing directory");
    }
    const files = await fs.promises.readdir(directory);
    if (files.length > 0) {
        // iterate through found files and directory
        for (const file of files) {
            if ((await fs.promises.lstat(path.join(directory, file))).isDirectory()) {
                // if the file is found to be a directory,
                // recursively call this function to remove subdirectory
                await removeDirAsync(path.join(directory, file), false);
            } else {
                //delete the file
                await fs.promises.unlink(path.join(directory, file));
            }
        }
    }
    // delete the directory now that it is empty.
    await fs.promises.rmdir(directory, { recursive: true, maxRetries: 20 });
    return true;
}

export async function uninstall(context: vscode.ExtensionContext) {
    const globalPath = context.globalStorageUri.fsPath;
    const title = "Are you sure you want to uninstall PROS?"
    const labelResponse = await vscode.window.showInformationMessage(title, "Uninstall Now!", "No Thanks.");
    if(labelResponse==="Uninstall Now!") {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Uninstalling PROS",
            cancellable: false
        }, async (progress, token) => {
            await removeDirAsync(globalPath,false);
        });
        vscode.window.showInformationMessage("PROS Uninstalled!");
    }
}

async function getUrls(version : number) {
    var downloadCli = `https://github.com/purduesigbots/pros-cli/releases/download/${version}/pros_cli-${version}-lin-64bit.zip`;
    var downloadToolchain = "https://developer.arm.com/-/media/Files/downloads/gnu-rm/10.3-2021.10/gcc-arm-none-eabi-10.3-2021.10-x86_64-linux.tar.bz2";

    if (system === "windows") {
        // Set system, path seperator, and downloads to windows version 
        downloadCli = `https://github.com/purduesigbots/pros-cli/releases/download/${version}/pros_cli-${version}-win-64bit.zip`;
        downloadToolchain = "https://artprodcus3.artifacts.visualstudio.com/A268c8aad-3bb0-47d2-9a57-cf06a843d2e8/3a3f509b-ad80-4d2a-8bba-174ad5fd1dde/_apis/artifact/cGlwZWxpbmVhcnRpZmFjdDovL3B1cmR1ZS1hY20tc2lnYm90cy9wcm9qZWN0SWQvM2EzZjUwOWItYWQ4MC00ZDJhLThiYmEtMTc0YWQ1ZmQxZGRlL2J1aWxkSWQvMjg4Ni9hcnRpZmFjdE5hbWUvdG9vbGNoYWluLTY0Yml00/content?format=file&subPath=%2Fpros-toolchain-w64-3.0.1-standalone.zip";
    } else if (system === "macos") {
        // Set system, path seperator, and downloads to windows version 
        downloadCli = `https://github.com/purduesigbots/pros-cli/releases/download/${version}/pros_cli-${version}-macos-64bit.zip`;
        downloadToolchain = "https://developer.arm.com/-/media/Files/downloads/gnu-rm/10.3-2021.10/gcc-arm-none-eabi-10.3-2021.10-mac.tar.bz2";
        os.cpus().some(cpu => {
            if (cpu.model.includes("Apple M1")) {
                downloadCli = `https://github.com/purduesigbots/pros-cli/releases/download/${version}/pros_cli-${version}-macos-arm64bit.zip`;
            }
        });
    }

    return [downloadCli, downloadToolchain];
}

export async function install(context: vscode.ExtensionContext) {
    const globalPath = context.globalStorageUri.fsPath;
    var version = await getCliVersion('https://api.github.com/repos/purduesigbots/pros-cli/releases/latest');
    console.log("Current CLI Version: " + version);

    // Get system type, path string separator, CLI download url, and toolchain download url.
    // Default variables are based on linux.
    let [downloadCli, downloadToolchain] = await getUrls(version);
    // Set the installed file names
    var cliName = `pros-cli-${system}.zip`;
    // Title of prompt depending on user's installed CLI
    var title = await getInstallPromptTitle(path.join(globalPath, "install", `pros-cli-${system}`, "pros"));
    // Name of toolchain download depending on system
    var toolchainName = `pros-toolchain-${system === "windows" ? `${system}.zip` : `${system}.tar.bz2`}`;
    // Does the user's CLI have an update or does the user need to install/update
    const cliVersion = (title.includes("up to date") ? "UTD" : null);
    if (cliVersion === null) {
        // Ask user to install CLI if it is not installed.
        const labelResponse = await vscode.window.showInformationMessage(title, "Install it now!", "No Thanks.");
        // const labelResponse = await vscode.window.showQuickPick(
        //     [{ label: "Install it now!", description: "recommended" }, { label: "No I am good." }],
        //     {
        //         placeHolder: "Install it now!",
        //         canPickMany: false,
        //         title: title,
        //     }
        // );
        if (labelResponse === "Install it now!") {
            // Install CLI if user chooses to.

            //delete the directory
            
            try {
                await removeDirAsync(context.globalStorageUri.fsPath, true);
            } catch(err) {
                console.log(err);
            }
            //add install and download directories
            const dirs = await createDirs(context.globalStorageUri.fsPath);

            /*
            Code to potentially wait for the cli and toolchain to be downloaded.

            const cli_info = [downloadCli,cliName,system];
            const toolchain_info = [downloadToolchain,toolchainName,system];
            await downloadCli_and_toolchain(context,cli_info,toolchain_info);
            */

            download(context, downloadCli, cliName, system);
            download(context, downloadToolchain, toolchainName, system);

            // Delete the download subdirectory once everything is installed

            //await removeDirAsync(dirs.download,false);
            // vscode.window.showInformationMessage("PROS is now Installed!");
            vscode.workspace
                .getConfiguration("pros")
                .update("showInstallOnStartup", false);
        } else {
            vscode.workspace
                .getConfiguration("pros")
                .update("showInstallOnStartup", false);
        }
    } else {
        // User already has the CLI installed
        vscode.window.showInformationMessage(title);
        vscode.workspace
            .getConfiguration("pros")
            .update("showInstallOnStartup", false);
    }
    // Set path variables to toolchain and CLI
    paths(globalPath, system, context);
}

export async function updateCLI(context: vscode.ExtensionContext) {
    const globalPath = context.globalStorageUri.fsPath;
    var title = await getInstallPromptTitle(path.join(globalPath, "install", `pros-cli-${system}`, "pros"));
    if(title.includes("up to date")) {
        vscode.window.showInformationMessage(title);
        return;
    }
    if(title.includes("not")) {
        install(context);
        return;
    }
    const labelResponse = await vscode.window.showInformationMessage(title, "Update Now!", "No Thanks.");
    if(labelResponse?.toLowerCase().includes("no thanks")) {
        return;
    }            
    try {
        await removeDirAsync(path.join(globalPath,"install",`pros-cli-${system}`),true);
    } catch(err) {
        //console.log(err);
    }
    var version = await getCliVersion('https://api.github.com/repos/purduesigbots/pros-cli/releases/latest');
    let [downloadCli, downloadToolchain] = await getUrls(version);
    // Set the installed file names
    var cliName = `pros-cli-${system}.zip`;
    // Title of prompt depending on user's installed CLI
    download(context, downloadCli, cliName, system);
    //await paths(globalPath, system ,context);
    
}

export async function paths(globalPath: string, system: string, context : vscode.ExtensionContext) {
    // (path.join(globalPath, "install", `pros-cli-${system}`));
    // Check if user has CLI installed through one-click or other means.
    let [version, oneClicked] = await getCurrentVersion(path.join(globalPath, "install", `pros-cli-${system}`, "pros"));
    PATH_SEP = (system==="windows" ? ";" : ":");
    process.env["VSCODE FLAGS"] = (version>=324?"--no-sentry --no-analytics":"");
    console.log(version);
    if (!oneClicked) {
        // Use system defaults if user does not have one-click CLI
        CLI_EXEC_PATH = "";
        TOOLCHAIN = "LOCAL";
    } else {
        // Set toolchain environmental variable file location
        TOOLCHAIN = path.join(globalPath, "install", `pros-toolchain-${system === "windows" ? path.join("windows", "usr") : system}`);
        // Set CLI environmental variable file location
        CLI_EXEC_PATH = path.join(globalPath, "install", `pros-cli-${system}`);
        
        // Prepend CLI to path
        process.env['PATH'] = CLI_EXEC_PATH+PATH_SEP+process.env['PATH'];
        // Having `PROS_TOOLCHAIN` set to TOOLCHAIN breaks everything, so idk. Empty string works don't question it
        process.env['PROS_TOOLCHAIN'] = TOOLCHAIN;
        process.env.LC_ALL = "en_US.utf-8";
        // Remake terminal with updated environment variables
        makeTerminal();
    }
}

/*

Code Implemented from clangd source code

*/


async function createDirs(storagePath: string) {
    // Create the download and install subdirectories
    const install = path.join(storagePath, 'install');
    const download = path.join(storagePath, 'download');
    for (const dir of [install, download]) {
        await fs.promises.mkdir(dir, { 'recursive': true });
    }
    // Return the two created directories
    return { install: install, download: download };
}

