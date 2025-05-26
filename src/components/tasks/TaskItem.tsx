"use client";

import type { Task, TaskStatus } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, Eye, CalendarDays } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: Task;
  onStatusChange?: (taskId: number, newStatus: TaskStatus) => void; // Optional: for future extension
}

const statusIcons: Record<TaskStatus, React.ElementType> = {
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
  const StatusIcon = statusIcons[task.status];
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
      
      return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateString));
    } catch (e) {
      return dateString; // fallback to original string if date is invalid
    }
  };


  return (
    <Card className="w-full transition-all hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{task.title}</CardTitle>
          <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'outline'} 
                 className={cn("capitalize", 
                   task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                   task.status === 'in-progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                   'bg-yellow-100 text-yellow-700 border-yellow-300'
                 )}>
            <StatusIcon className={cn("mr-2 h-4 w-4", task.status === 'in-progress' && "animate-spin")} />
            {task.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center text-sm text-muted-foreground pt-1">
          <CalendarDays className="mr-2 h-4 w-4" />
          Due: {formatDate(task.dueDate)}
        </CardDescription>
      </CardHeader>
      {task.description && (
        <CardContent>
          <p className="text-sm text-foreground line-clamp-2">
            {task.description}
          </p>
        </CardContent>
      )}
      <CardFooter>
        <Link href={`/tasks/${task.id}`} passHref legacyBehavior>
          <Button variant="outline" size="sm" asChild>
            <a><Eye className="mr-2 h-4 w-4" /> View Details</a>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
