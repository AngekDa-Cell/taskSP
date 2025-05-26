import type { User, Task, TaskStatus } from './types';

// Mock Users
export const mockUsers: User[] = [
  { id: 1, username: 'testuser' },
  { id: 2, username: 'anotheruser' },
];

// Mock Tasks
export let mockTasks: Task[] = [
  {
    id: 1,
    userId: 1,
    title: 'Complete project proposal',
    description: 'Finalize the proposal document for the new client project. Include budget breakdown and timeline.',
    creationDate: new Date().toISOString(),
    dueDate: new Date().toISOString().split('T')[0], // Today
    status: 'in-progress',
  },
  {
    id: 2,
    userId: 1,
    title: 'Team meeting',
    description: 'Discuss weekly progress and upcoming sprints.',
    creationDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    dueDate: new Date().toISOString().split('T')[0], // Today
    status: 'pending',
  },
  {
    id: 3,
    userId: 1,
    title: 'Code review for feature X',
    description: 'Review pull request #123 for Feature X implementation.',
    creationDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    status: 'pending',
  },
  {
    id: 4,
    userId: 2,
    title: 'Grocery Shopping',
    description: 'Buy milk, eggs, bread, and cheese.',
    creationDate: new Date().toISOString(),
    dueDate: new Date().toISOString().split('T')[0], // Today
    status: 'completed',
  },
];

// --- Mock Stored Procedure Calls ---

export const mock_SP_AuthenticateUser = async (username: string, password_plaintext: string): Promise<User | null> => {
  // In a real app, password would be hashed and compared securely.
  // This is a very basic mock.
  const user = mockUsers.find(u => u.username === username);
  if (user && password_plaintext === "password123") { // Mock password
    return user;
  }
  return null;
};

export const mock_SP_GetTasksForUserByDate = async (userId: number, targetDate: string): Promise<Task[]> => {
  // targetDate is YYYY-MM-DD
  return mockTasks.filter(task => task.userId === userId && task.dueDate === targetDate);
};

export const mock_SP_GetTaskDetails = async (taskId: number, userId: number): Promise<Task | null> => {
  const task = mockTasks.find(t => t.id === taskId && t.userId === userId);
  return task || null;
};

export const mock_SP_CreateTask = async (userId: number, title: string, description: string, dueDate: string): Promise<Task> => {
  const newTask: Task = {
    id: Math.max(0, ...mockTasks.map(t => t.id)) + 1,
    userId,
    title,
    description,
    creationDate: new Date().toISOString(),
    dueDate,
    status: 'pending',
  };
  mockTasks.push(newTask);
  return newTask;
};

export const mock_SP_UpdateTaskStatus = async (taskId: number, userId: number, status: TaskStatus): Promise<boolean> => {
  const taskIndex = mockTasks.findIndex(t => t.id === taskId && t.userId === userId);
  if (taskIndex > -1) {
    mockTasks[taskIndex].status = status;
    return true;
  }
  return false;
};
