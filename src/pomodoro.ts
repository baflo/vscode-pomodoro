import * as vscode from 'vscode';
import { Task } from './task';
import { TimeUnits, Timer } from './timer';
import { getConfig } from './config';
import { YesNoPrompt, InputPrompt, StatusBar } from './ui';
import { TaskStorage } from './storage';


export class Pomodoro {
	private static _instance: Pomodoro;

	private _statusBars: StatusBar = StatusBar.getInstance();

	private _storage: TaskStorage;

	public tasks: Task[];
	public completedTasksCounter: number;
	public currentTaskIndex: number;

	private breakCounter: number;

	private _timer: Timer;

	private constructor() {
		this.tasks = [] as Task[];
		this.completedTasksCounter = 0;
		this.breakCounter = 0;
		this._storage = new TaskStorage(getConfig().tasks_file);
	}

	public static getInstance(): Pomodoro {		
		if (Pomodoro._instance === null || Pomodoro._instance === undefined) {
			Pomodoro._instance =  new Pomodoro();
		}
		return Pomodoro._instance;
	}

	public preload() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro._storage.load();

		for (let taskIndex in pomodoro.tasks) {			
			if (pomodoro.tasks[taskIndex].startTime === null) {				
				break;
			} else {				
				if (pomodoro.tasks[taskIndex].isCompleted) {
					pomodoro.completedTasksCounter ++;
				} else {
					pomodoro.currentTaskIndex = parseInt(taskIndex);
				}
			}
		}
		
		if (pomodoro.currentTaskIndex !== undefined && pomodoro.tasks[pomodoro.currentTaskIndex].startTime !== null) {
			pomodoro.run();
		}
	}

	public async addTask({ taskName, taskTags }: { taskName?: string | { command: string }, taskTags?: Array<string | { command: string }>} = {}) {
		const pomodoro = Pomodoro.getInstance();
		let taskNamePlaceholder = "task name (test)";
		let optionalTaskTags: string[] = [];

		if (typeof taskName === "string") {
			taskNamePlaceholder = taskName;
		} else if (typeof taskName === "object") {
			const result = await vscode.commands.executeCommand(taskName.command);
			if (typeof result === "string") {
				taskNamePlaceholder = result;
			}
		}

		if (Array.isArray(taskTags)) {
			for(const tagSource of taskTags){
				if (typeof tagSource === "string") {
					optionalTaskTags.push(tagSource);
				} else if (typeof tagSource === "object") {
					const result = await vscode.commands.executeCommand(tagSource.command);

					if (typeof result === "string") {
						optionalTaskTags.push(result);
					} else if (Array.isArray(result)) {
						optionalTaskTags.push(...result);
					}
				}
			}
		}

		const newTask: string = await InputPrompt(`Add a new task to the Pomodoro`, taskNamePlaceholder);

		pomodoro.tasks.push(new Task(newTask, null, null, optionalTaskTags));
		pomodoro._storage.save();

		pomodoro._statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length)
	}

	public run() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.pickTask();
		if (pomodoro.currentTaskIndex < pomodoro.tasks.length) {
			pomodoro._statusBars.updateCurrentTask(`Focus: `+pomodoro.tasks[pomodoro.currentTaskIndex].name)
		
			pomodoro._timer = pomodoro.tasks[pomodoro.currentTaskIndex].startTask(pomodoro.askAboutTaskCompletion);
			pomodoro._statusBars.updateStartBar();
			pomodoro._storage.save();	
		} else {
			return;
		}		
	}

	public pause() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.tasks[pomodoro.currentTaskIndex].PauseTask();
		pomodoro._timer.stop();
		pomodoro._statusBars.updateStartBar();
		pomodoro._storage.save();		
	}

	public stopTask() {
		const pomodoro = Pomodoro.getInstance();
		pomodoro._timer.reset();

		pomodoro.finishTask();
		pomodoro._storage.save();
		pomodoro.takeBreak();
	}

	public getFinishedTasks(tag?: string) {
		const pomodoro = Pomodoro.getInstance();
		const finishedTasks = pomodoro.tasks.filter(t => t.isCompleted);

		return tag
			? finishedTasks.filter(t => t.tags?.includes(tag))
			: finishedTasks;
	}

	public getFinishedTasksCount(tag?: string) {
		return this.getFinishedTasks(tag)?.length ?? 0;
	}

	private pickTask(): void {
		const pomodoro = Pomodoro.getInstance();
		if (pomodoro.tasks.length > 0) {
			if (pomodoro.currentTaskIndex === undefined) {
				pomodoro.currentTaskIndex = 0;
			} else {
				if (pomodoro.tasks[pomodoro.currentTaskIndex].isCompleted) {
					pomodoro.currentTaskIndex += 1;
				}
			}
		}
	}

	private async askAboutTaskCompletion() {
		const pomodoro = Pomodoro.getInstance();
		const response: boolean = await YesNoPrompt(`Did you finish the task?`);
		if(response) {
			pomodoro.finishTask();
		}
		pomodoro.takeBreak();
	}

	private takeBreak(): void {
		const pomodoro = Pomodoro.getInstance();		
		if (pomodoro.breakCounter < getConfig().counter_to_long_break) {
			pomodoro._timer = new Timer(getConfig().break_duration, TimeUnits.Milliseconds);
			pomodoro.breakCounter++;
		} else {
			pomodoro._timer = new Timer(getConfig().long_break_duration, TimeUnits.Milliseconds);
			pomodoro.breakCounter = 0;
		}
		pomodoro._statusBars.updateCurrentTask(`Break 💃🏻`);
		pomodoro._timer.start(pomodoro.run);
	}

	public clearCompleted(): void {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.tasks = pomodoro.tasks.filter(function (task) {
			return !task.isCompleted;
		});

		pomodoro.completedTasksCounter = 0;
		pomodoro.currentTaskIndex = undefined;
		pomodoro._storage.save();
		pomodoro._statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length)
	}

	private finishTask(): void {
		const pomodoro = Pomodoro.getInstance();
		pomodoro.tasks[pomodoro.currentTaskIndex].CompleteTask();
		pomodoro.completedTasksCounter ++;
		pomodoro._statusBars.updateTasksCounter(pomodoro.completedTasksCounter, pomodoro.tasks.length)
		pomodoro._storage.save();
	}
}