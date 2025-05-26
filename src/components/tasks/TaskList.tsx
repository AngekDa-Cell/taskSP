"use client";

import type { Task } from "@/lib/types";
import { TaskItem } from "./TaskItem";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TaskListProps {
  tasks: Task[];
  title?: string;
}

export function TaskList({ tasks, title = "Tasks" }: TaskListProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="mt-8">
        <Alert className="bg-card border-border shadow">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>No Tasks Found</AlertTitle>
          <AlertDescription>
            There are no tasks to display for this selection.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task, index) => (
        <TaskItem key={task.id || `task-${index}`} task={task} />
      ))}
    </div>
  );
}
