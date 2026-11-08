const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const taskList = document.getElementById("task-list");
const status = document.getElementById("status-message");
const taskCount = document.getElementById("task-count");
const formTitle = document.getElementById("form-heading");
const submitButton = document.getElementById("task-submit");
const cancelButton = document.getElementById("cancel-edit");

let config;
let editingId = null;

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}

async function start() {
  try {
    config = await fetch("config.json").then(response => response.json());
    config.supabaseUrl = config.supabaseUrl.replace(/\/$/, "");
    await loadTasks();
  } catch {
    message("Check your config.json file.", true);
  }
}

function apiUrl(query = "") {
  return `${config.supabaseUrl}/rest/v1/tasks${query}`;
}

function apiHeaders(extra = {}) {
  return {
    apikey: config.supabasePublishableKey,
    Authorization: `Bearer ${config.supabasePublishableKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: apiHeaders(options.headers)
  });
  if (!response.ok) throw new Error("Supabase request failed. Check your database settings.");
  return response.status === 204 ? null : response.json();
}

function getTasks() {
  return request(apiUrl("?select=*&order=id.desc"));
}

function addTask(title, description) {
  return request(apiUrl(), {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ title, description, completed: false })
  });
}

function editTask(id, data) {
  return request(apiUrl(`?id=eq.${id}`), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
}

function deleteTask(id) {
  return request(apiUrl(`?id=eq.${id}`), { method: "DELETE" });
}

function button(text, className, action) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.className = className;
  element.addEventListener("click", action);
  return element;
}

function showTasks(tasks) {
  taskList.replaceChildren();
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  if (tasks.length === 0) {
    taskList.textContent = "No tasks yet. Add your first task above.";
    return;
  }

  tasks.forEach(task => {
    const card = document.createElement("article");
    card.className = "task-item";

    const heading = document.createElement("div");
    heading.className = "task-top";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    const state = document.createElement("span");
    state.className = "task-status" + (task.completed ? " completed" : "");
    state.textContent = task.completed ? "Completed" : "Incomplete";
    heading.append(title, state);

    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description || "No description";

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(
      button("Edit", "secondary", () => beginEdit(task)),
      button(task.completed ? "Mark incomplete" : "Mark complete", "success", () => changeStatus(task)),
      button("Delete", "danger", () => removeTask(task.id))
    );

    card.append(heading, description, actions);
    taskList.append(card);
  });
}

async function loadTasks() {
  message("Loading tasks...");
  try {
    showTasks(await getTasks());
    message("");
  } catch (error) {
    message(error.message, true);
  }
}

function beginEdit(task) {
  editingId = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description || "";
  formTitle.textContent = "Edit task";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
}

function resetForm() {
  editingId = null;
  form.reset();
  formTitle.textContent = "Add a task";
  submitButton.textContent = "Add task";
  cancelButton.hidden = true;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) return message("Enter a task title.", true);

  try {
    if (editingId === null) {
      await addTask(title, description);
      message("Task added.");
    } else {
      await editTask(editingId, { title, description });
      message("Task updated.");
    }
    resetForm();
    await loadTasks();
  } catch (error) {
    message(error.message, true);
  }
});

cancelButton.addEventListener("click", resetForm);

async function changeStatus(task) {
  try {
    await editTask(task.id, { completed: !task.completed });
    await loadTasks();
  } catch (error) {
    message(error.message, true);
  }
}

async function removeTask(id) {
  if (!confirm("Delete this task?")) return;
  try {
    await deleteTask(id);
    if (editingId === id) resetForm();
    message("Task deleted.");
    await loadTasks();
  } catch (error) {
    message(error.message, true);
  }
}

start();
