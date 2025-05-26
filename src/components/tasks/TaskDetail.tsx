"use client";

import type { Task, TaskStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2, CalendarDays, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface TaskDetailProps {
  taskId: number;
  userId: number;
  onTaskUpdatedAction: () => void; // Callback to refresh task list or parent component
}

const statusIcons: Record<TaskStatus, React.ElementType> = {
  pending: Circle,
  'in-progress': Loader2,
  completed: CheckCircle2,
};

export function TaskDetail({ taskId, userId, onTaskUpdatedAction }: TaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const StatusIcon = task ? statusIcons[task.status] : null;

  useEffect(() => {
    async function fetchTaskDetail() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          headers: { 'x-user-id': String(userId) },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch task details');
        }
        const data = await response.json();
        setTask(data);
      } catch (err: any) {
        setError(err.message);
      }
    }

    fetchTaskDetail();
  }, [taskId, userId]);

  const formatDate = (dateString: string, includeTime: boolean = false) => {
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      return new Intl.DateTimeFormat('en-US', options).format(new Date(dateString));
    } catch(e) {
      return dateString;
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(userId),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      setTask({ ...task, status: newStatus });
      toast({ title: "Status Updated", description: `Task status changed to ${newStatus}.` });
      onTaskUpdatedAction(); // Notify parent about the update
    } catch (err: any) {
      setError(err.message);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update task status." });
    }
    setIsUpdatingStatus(false);
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!task) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-3xl font-bold text-primary">{task.title}</CardTitle>
          <Badge 
            variant={task.status === 'completed' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'outline'} 
            className={cn("capitalize text-sm px-3 py-1", 
              task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
              task.status === 'in-progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
              'bg-yellow-100 text-yellow-700 border-yellow-300'
            )}
          >
            {StatusIcon && (
              <StatusIcon className={cn("mr-2 h-4 w-4", task.status === 'in-progress' && "animate-spin")} />
            )}
            {task.status}
          </Badge>
        </div>
        <CardDescription className="text-base text-muted-foreground">
          Detailed information for your task.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center">
            <Info className="mr-2 h-5 w-5 text-accent" /> Description
          </h3>
          <p className="text-foreground/90 whitespace-pre-wrap">
            {task.description || "No description provided."}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-accent" /> Due Date
            </h3>
            <p className="text-foreground/90">{formatDate(task.dueDate)}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-accent" /> Created On
            </h3>
            <p className="text-foreground/90">{formatDate(task.creationDate, true)}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
             Update Status
          </h3>
          <div className="flex items-center gap-2">
            <Select value={task.status} onValueChange={(value) => handleStatusChange(value as TaskStatus)} disabled={isUpdatingStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            {isUpdatingStatus && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
