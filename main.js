const obsidian = require('obsidian');

const task_statuses = [
	{status: ' ' , label:'to-do'},
	{status: '/' , label:'incomplete'},
	{status: '>' , label:'forwarded'},
	{status: '<' , label:'scheduling'},
	{status: '?' , label:'question'},
	{status: '!' , label:'important'},
	{status: '*' , label:'star'},
	{status: '"' , label:'quote'},
	{status: 'l' , label:'location'},
	{status: 'b' , label:'bookmark'},
	{status: 'i' , label:'information'},
	{status: 'S' , label:'savings'},
	{status: 'I' , label:'idea'},
	{status: 'p' , label:'pros'},
	{status: 'c' , label:'cons'},
	{status: 'f' , label:'fire'},
	{status: 'k' , label:'key'},
	{status: 'w' , label:'win'},
	{status: 'u' , label:'up'},
	{status: 'd' , label:'down'},
	{status: 'n' , label:'needle'},
	{status: 'r' , label:'right'},
	{status: 't' , label:'time'},
	{status: 'x' , label:'done'},
	{status: '-' , label:'canceled'},
];



class AddNewTaskStatusEntry extends obsidian.Modal {
  constructor(app, onSubmit) { 
	super(app);	
	let entry = {status: " ", label: ""};
	
	this.contentEl.createEl('h2', {text:"Add new task-status"})
	this.contentEl.createEl('br')
	
	new obsidian.Setting(this.contentEl) 
      .setName('Status symbol (single character)')
      .addText((text) =>
        text.onChange((value) => {
          entry["status"] = value;
        }));
		
	new obsidian.Setting(this.contentEl) 
      .setName('Label')
      .addText((text) =>
        text.onChange((value) => {
          entry["label"] = value;
        }));

    new obsidian.Setting(this.contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Add')
          .setCta()
          .onClick(async () => {
            this.close();
			if ( entry["label"] ) {
				await onSubmit(entry);
			}
          }
		  ));
  }
  }


class SettingTab extends obsidian.PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
		
		this.component = new obsidian.Component()
	    this.component.load()
		console.log(this)		
		
  }

	async onNewItem (item) {
	  this.plugin.settings.taskStatusEntries.push(item)
	  await this.plugin.saveData(this.plugin.settings);
	  this.update();
	}

	async reset_task_statuses() {
		console.log("resetting")
		this.plugin.settings.taskStatusEntries = JSON.parse(JSON.stringify(task_statuses))
		await this.plugin.saveData(this.plugin.settings);
		this.update()
	}

	  
  getSettingDefinitions() {
    return [
		{
		name: 'Trigger task-status autocompletion when typing: "- ["',
		control: { type: 'toggle', key: 'addEditorAutocompletion' },
		},
		{name: 'Reset task status list.',
		render: (setting) => {
			let containerEl = setting.infoEl  // controlEl
			containerEl.empty();
			new obsidian.Setting(containerEl)
			.setName("Reset")
			.setDesc("Reset the task-status list to the default.")
			.addButton((btn) => btn.setButtonText('Reset').onClick(async () => await this.reset_task_statuses()))
		}},
		{
		  type: 'list',
		  heading: 'Task Status List',
		  emptyState: 'No task status set.',
		  addItem: {
			name: 'Add task status',
			action: () => new AddNewTaskStatusEntry(this.app, async (item) => await this.onNewItem(item)).open(),
		  },
		  
		  
		  onReorder: async (oldIndex, newIndex) => {
			let taskstatuses = this.plugin.settings.taskStatusEntries;
			let [moved] = taskstatuses.splice(oldIndex, 1);
			taskstatuses.splice(newIndex, 0, moved);
			await this.plugin.saveData(this.plugin.settings);
						this.update();

		  },
		  onDelete: async (idx) => {
			this.plugin.settings.taskStatusEntries.splice(idx, 1);
			await this.plugin.saveData(this.plugin.settings);
			this.update();
		  },
		  items: this.plugin.settings.taskStatusEntries.map((taskstatus) => ({
			name: "",
			searchable: false,
			render: (setting) => {
				let containerEl = setting.infoEl  // controlEl
				containerEl.empty();
			
				let container = containerEl.createEl('div', {cls: "task_selection_settings_entry"});
				obsidian.MarkdownRenderer.render(
					this.app, 
					`- [${taskstatus.status}] ${taskstatus.label} <span style="float:right; font-family:monospace">[${taskstatus.status}]</span>`, 
					container, "", this.component)
				},
		  })),
	},
	
	]
		
}
  
  
}

const DEFAULT_SETTINGS = {
	"addEditorAutocompletion": true,
	"textstatuslist": "asdf",
	"taskStatusEntries": JSON.parse(JSON.stringify(task_statuses))  // deep-copy default task statuses
}
	



class TaskStatusSuggester extends obsidian.SuggestModal {
  constructor(plugin, editor, relevant_lines) {
	  super(plugin.app)
	  this.plugin = plugin

	  this.component = new obsidian.Component()
	  this.component.load()

      this.editor = editor
	  this.relevant_lines = relevant_lines
  }
  
  // Returns all available suggestions.
  getSuggestions(query){
	return this.plugin.settings.taskStatusEntries.filter((taskstatus) =>
	  taskstatus.label.toLowerCase().includes(query.toLowerCase())
	);
  }

  // Renders each suggestion item.
  renderSuggestion(taskstatus, el) {
	let container = el.createEl('div', {cls: "task_selection_modal_entry"});
	obsidian.MarkdownRenderer.render(
		this.app, 
		`- [${taskstatus.status}] ${taskstatus.label} <span style="float:right; font-family:monospace">[${taskstatus.status}]</span>`, 
		container, "", this.component)
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(taskstatus, evt) {	

	const task_entry = `- [${taskstatus.status}] `;
	
	for ( const [line, line_text] of this.relevant_lines ) {
		if ( line_text.length == 0 ) {
			this.editor.replaceRange(task_entry, {"line": line, "ch": 0});
			this.editor.setCursor({"line": line, "ch": task_entry.length});
		} else {
			this.editor.replaceRange(task_entry, {"line": line, "ch": 0}, {"line": line, "ch": task_entry.length});
		}
	}
	
  }
  
}


class TaskStatusEditorSuggest extends obsidian.EditorSuggest {
  constructor(plugin) {
	  super(plugin.app)
	  this.plugin = plugin
	  	 
	  this.component = new obsidian.Component()
	  this.component.load()

  }
  
  onTrigger(cursor, editor, file) {
	  const current_line_text = editor.getLine(cursor.line)
	  if ( current_line_text.startsWith("- [") ) {
		  if ( current_line_text.length >= 5 ) {return null;}
		  return { 
			  start: editor.getCursor(),
				end: editor.getCursor(),
				query: editor.getLine(cursor.line)
			};
	  } else {
		  return null;
	  }	  
  }
  
  getSuggestions(context){ return this.plugin.settings.taskStatusEntries; }

  renderSuggestion(item, el) {
	let container = el.createEl('div', {cls: "task_selection_modal_entry"});
	obsidian.MarkdownRenderer.render(
		this.plugin.app, 
		`- [${item.status}] ${item.label} <span style="float:right; font-family:monospace">[${item.status}]</span>`, 
		container, "", this.component)
  }

  selectSuggestion(item, evt) {
	const currentView = this.plugin.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    const editor = currentView?.editor;
	if (!editor) return;
	
	const task_entry = `- [${item.status}] `;
	const cursor = editor.getCursor();
	const curr_line_text = editor.getLine(cursor.line)
	
	editor.replaceRange(task_entry, {"line": cursor["line"], "ch": 0}, {"line": cursor["line"], "ch": Math.min(task_entry.length, curr_line_text.length)});
	editor.setCursor({"line": cursor["line"], "ch": task_entry.length});
	this.close()
  }
}


function isTaskText(text) {
	// test if text defines a task (i.e. starts with - [.] )
	return /^- \[.\]/.test(text)
}

class TaskStatusSelector extends obsidian.Plugin {
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));

		// add autocompletion
		this.settings.addEditorAutocompletion && this.registerEditorSuggest(new TaskStatusEditorSuggest(this));
				
		this.addCommand({
		  id: 'add-task-status',
		  name: 'Add Task Status',
		  editorCallback: (editor) => {
			const something_selected = editor.somethingSelected();
			let [start, stop] = ["anchor", "head"]
			let relevant_lines = [];

			if ( something_selected ) {
				// in case something is selected, get all lines that represent task-entries
				for ( const selection of editor.listSelections() ) {
					// to avoid issues with bottom-to-top selections or left-to-right 
					// selections in the same line, we need to check if anchor is > head
					if ( (selection.anchor["line"] > selection.head["line"] ) || 
						 ( selection.anchor["line"] == selection.head["line"] && selection.anchor["ch"] > selection.head["ch"])
						) {
						[start, stop] = ["head", "anchor"] 
					}

					for (let i = selection[start]["line"]; i <= selection[stop]["line"]; i++) {						
						const line_text = editor.getLine(i)
						// in case a line is selected without 'visible' selection of a character, skip it
						if ( ( i == selection[start]["line"] && line_text.length == selection[start]["ch"] ) || 
							 ( i == selection[stop]["line"] && selection[stop]["ch"] == 0 ) ) {
							continue
						}
						isTaskText(line_text) && relevant_lines.push([i, line_text])
					}
				}
			} else {
				// if no selection was made, check the current line or add new task if empty
				const cursor = editor.getCursor();
				const line_text = editor.getLine(cursor.line);
				( isTaskText(line_text) || line_text.length == 0 ) && relevant_lines.push([cursor.line, line_text])
			}
			
			if ( relevant_lines.length == 0 ) {
				if ( something_selected ) {
					new obsidian.Notice("There are no task-statuses to replace in the current selection.")
				} else {
					new obsidian.Notice("Cannot replace task-status on non-empty line.")
				}
				return
			}

			new TaskStatusSuggester(this, editor, relevant_lines).open();
		  },
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

module.exports = TaskStatusSelector;