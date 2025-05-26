"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { mock_SP_GetTaskDetails } from '@/lib/mock-data';
import type { Task } from '@/lib/types';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const taskId = Number(params.id);

  const fetchTask = useCallback(async () => {
    if (user && taskId) {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTask = await mock_SP_GetTaskDetails(taskId, user.id);
        if (fetchedTask) {
          setTask(fetchedTask);
        } else {
          setError("Task not found or you don't have permission to view it.");
        }
      } catch (e) {
        setError("Failed to load task details.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    } else if (!user) {
        // Wait for user to be loaded if not available yet
    } else {
        setError("Invalid task ID.");
        setIsLoading(false);
    }
  }, [user, taskId]);


  useEffect(() => {
    if(user){ // only fetch if user is loaded
      fetchTask();
    }
  }, [user, fetchTask]);

  const handleTaskUpdated = () => {
    // Refetch task details when an update (like status change) happens
    fetchTask();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!task) {
     // This case should ideally be covered by error state, but as a fallback:
    return (
      <div className="space-y-6">
         <Button variant="outline" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
        </Button>
        <Alert>
          <AlertTitle>Task Not Found</AlertTitle>
          <AlertDescription>The requested task could not be loaded.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-6 group transition-colors hover:bg-primary/10">
        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Dashboard
      </Button>
      <TaskDetail task={task} onTaskUpdated={handleTaskUpdated} />
    </div>
  );
}
