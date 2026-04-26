/**
 * EXP_009 — Task loader
 *
 * Reads all task JSON files from src/data/experiments/exp_009/tasks/,
 * validates each against TaskSchema, and returns the typed Task array.
 * Invalid files are logged and skipped — they do not crash the loader.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { TaskSchema, type Task } from './types';

const TASKS_DIR = join(process.cwd(), 'src', 'data', 'experiments', 'exp_009', 'tasks');

/**
 * Load and validate all tasks from the tasks directory.
 * Returns only the tasks that pass schema validation.
 */
export async function loadTasks(): Promise<Task[]> {
  let files: string[];

  try {
    files = await readdir(TASKS_DIR);
  } catch (err: unknown) {
    console.error(`[exp_009][task-loader] Failed to read tasks directory: ${String(err)}`);
    return [];
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();
  const tasks: Task[] = [];

  for (const file of jsonFiles) {
    const filePath = join(TASKS_DIR, file);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const json: unknown = JSON.parse(raw);
      const result = TaskSchema.safeParse(json);

      if (result.success) {
        tasks.push(result.data);
      } else {
        const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        console.warn(`[exp_009][task-loader] Skipping invalid task file ${file}: ${errors.join(', ')}`);
      }
    } catch (err: unknown) {
      console.warn(`[exp_009][task-loader] Failed to parse ${file}: ${String(err)}`);
    }
  }

  return tasks;
}

/**
 * Load a single task by ID. Returns undefined if not found or invalid.
 */
export async function loadTaskById(id: string): Promise<Task | undefined> {
  const tasks = await loadTasks();
  return tasks.find((t) => t.id === id);
}
