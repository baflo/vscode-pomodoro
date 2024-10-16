import * as vscode from 'vscode';
import { Pomodoro } from './pomodoro';
import { StatusBar } from './ui';

export function activate(context: vscode.ExtensionContext) {
	const pomodoro = Pomodoro.getInstance();
	const statusBars = StatusBar.getInstance();

	pomodoro.preload();
	
	statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length);

	vscode.commands.registerCommand(`pomodoro.addTask`, (args: any) => pomodoro.addTask(args));
	vscode.commands.registerCommand(`pomodoro.run`, () => pomodoro.run());	
	vscode.commands.registerCommand(`pomodoro.clear`, () => pomodoro.clearCompleted());	
	vscode.commands.registerCommand(`pomodoro.pause`, () => pomodoro.pause());
	vscode.commands.registerCommand(`pomodoro.finishTask`, () => pomodoro.stopTask());
	vscode.commands.registerCommand(`pomodoro.getFinishedTasksCount`, (args: any) => pomodoro.getFinishedTasksCount(args));
}

export function deactivate() {}
