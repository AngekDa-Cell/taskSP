"use client";

import { Task, TaskStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Circle, Loader2, CheckCircle2, CalendarDays, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TaskItemProps {
  task: Task;
  onStatusChange?: (taskId: number, newStatus: TaskStatus) => void; // Optional: for future extension
}

const statusIcons: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  pending: Circle,
  'in-progress': Loader2,
  completed: CheckCircle2,
};

const statusColors: Record<TaskStatus, string> = {
  pending: "bg-yellow-500",
  'in-progress': "bg-blue-500",
  completed: "bg-green-500",
}

const statusTextColors: Record<TaskStatus, string> = {
  pending: "text-yellow-700 dark:text-yellow-300",
  'in-progress': "text-blue-700 dark:text-blue-300",
  completed: "text-green-700 dark:text-green-300",
};

export function TaskItem({ task }: TaskItemProps) {
  const StatusIcon = statusIcons[task.status] || (() => null);
  const statusColorClass = statusColors[task.status] || "bg-gray-500";
  const statusTextColorClass = statusTextColors[task.status] || "text-gray-700";

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if due date is today, tomorrow, or yesterday for user-friendly display
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      date.setHours(0,0,0,0); // Compare dates only

      if (date.getTime() === today.getTime()) return "Today";
      if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
      if (date.getTime() === yesterday.getTime()) return "Yesterday";
      
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
    } catch (e) {
      return dateString; // fallback to original string if date is invalid
    }
  };


  return (
    <Card className="w-full transition-all hover:shadow-lg flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
            <Link href={`/tasks/${task.id}`} className="hover:underline">
              {task.title || "Untitled Task"}
            </Link>
          </CardTitle>
          <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'outline'}
                 className={`capitalize ${statusColorClass} ${statusTextColorClass} border-none text-xs px-2 py-1`}>
            <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
            {task.status.replace('-', ' ')}
          </Badge>
        </div>
        {task.dueDate && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Due: {formatDate(task.dueDate)}
          </div>
        )}
      </CardHeader>
      {task.description && (
        <CardContent className="pt-0 pb-3 text-sm text-muted-foreground flex-grow">
          <p className="line-clamp-2">{task.description}</p>
        </CardContent>
      )}
      <CardFooter className="pt-2 pb-4 flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tasks/${task.id}`}>
            View Details
            <Info className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
