"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, Edit3, Loader2, Save, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
 import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para la edición
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [editStatus, setEditStatus] = useState<'pending' | 'in-progress' | 'completed'>('pending');


  const taskId = params && params.id ? (Array.isArray(params.id) ? parseInt(params.id[0], 10) : parseInt(params.id, 10)) : null;

  const fetchTaskDetails = useCallback(async () => {
    if (!isAuthenticated || !user || !taskId || isNaN(taskId)) {
      if (taskId && isNaN(taskId)) setError("Invalid Task ID format.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'GET',
        headers: { 'x-user-id': String(user.id) },
        cache: 'no-store', // Prevent caching
      });
      if (!response.ok) {
         const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch task details. Status: ${response.status}`);
      }
      const data: Task = await response.json();
      setTask(data);
      // Inicializar estados de edición
      setEditTitle(data.title);
      setEditDescription(data.description || '');
      setEditDueDate(data.dueDate ? parseISO(data.dueDate) : undefined);
      setEditStatus(data.status);

    } catch (err: any) {
      console.error("Error fetching task details:", err);
      setError(err.message || "Could not load task details.");
      toast({ variant: "destructive", title: "Error", description: err.message });
      setTask(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, taskId, toast]);

  useEffect(() => {
    if (!isLoadingAuth) { // Solo cargar si la autenticación ha terminado
        if (isAuthenticated && user && taskId) {
            fetchTaskDetails();
        } else if (!isAuthenticated && !isLoadingAuth) {
            router.replace('/login');
        }
    }
  }, [isAuthenticated, user, taskId, isLoadingAuth, fetchTaskDetails, router]);


  const handleUpdateTask = async () => {
    if (!task || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Task or user not available.",
      });
      return;
    }
    if (!editTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title cannot be empty.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        title: editTitle,
        description: editDescription,
        dueDate: editDueDate ? format(editDueDate, 'yyyy-MM-dd') : null,
        status: editStatus,
      };

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id),
        },
        body: JSON.stringify(body),
        cache: 'no-store', // Prevent caching for the update operation's subsequent effects
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update task. Status: ${response.status}`);
      }

      const updatedTaskData: Task = await response.json(); 

      setTask(updatedTaskData);
      setIsEditing(false);
      toast({
        title: "Task Updated",
        description: "Your task has been successfully updated.",
      });
      // router.refresh(); // Consider if needed for more complex scenarios or Server Components
    } catch (err: any) {
      console.error("Error updating task:", err);
      toast({ variant: "destructive", title: "Error", description: err.message || "Could not update task." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'pending' | 'in-progress' | 'completed') => {
    if (!task || !user) return;
    // Optimistic update for UI responsiveness
    const originalTask = { ...task };
    setTask(prev => prev ? { ...prev, status: newStatus } : null);
    setEditStatus(newStatus); // Actualizar también el estado de edición

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user.id) // ¡IMPORTANTE! En una app real, userId vendría de la sesión/token
        },
        body: JSON.stringify({ status: newStatus }),
        cache: 'no-store', // Prevent caching
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update task status. Status: ${response.status}`);
      }
      toast({ title: "Status Updated", description: `Task status changed to ${newStatus}.` });
      // No es necesario refetch si la API confirma, ya hicimos optimistic update
      // fetchTaskDetails(); // Opcional, si quieres re-sincronizar completamente
    } catch (err: any) {
      console.error("Error updating task status:", err);
      toast({ variant: "destructive", title: "Error", description: err.message || "Could not update status." });
      setTask(originalTask); // Revertir en caso de error
      setEditStatus(originalTask.status); // Revertir estado de edición
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !user) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': String(user.id) } // ¡IMPORTANTE! En una app real, userId vendría de la sesión/token
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete task. Status: ${response.status}`);
      }
      toast({ title: "Task Deleted", description: `Task "${task.title}" has been deleted.` });
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Error deleting task:", err);
      toast({ variant: "destructive", title: "Error", description: err.message || "Could not delete task." });
      setIsLoading(false);
    }
  };


  if (isLoadingAuth || (isLoading && !error)) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="container mx-auto flex h-[calc(100vh-10rem)] flex-col items-center justify-center p-4 text-center">
         <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Error Loading Task</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto flex h-[calc(100vh-10rem)] flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-6">Task not found.</h2>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const creationDateFormatted = task.creationDate && isValid(parseISO(task.creationDate)) ? format(parseISO(task.creationDate), 'PPP p') : 'N/A';
  const dueDateFormatted = task.dueDate && isValid(parseISO(task.dueDate)) ? format(parseISO(task.dueDate), 'PPP') : 'N/A';

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          {!isEditing ? (
            <>
              <div className="flex justify-between items-start">
                <CardTitle className="text-3xl font-bold text-primary break-words">{task.title}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} disabled={isLoading}>
                    <Edit3 className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="flex items-center text-sm text-muted-foreground pt-1">
                <CalendarDays className="mr-2 h-4 w-4" />
                Due: {dueDateFormatted}
              </CardDescription>
            </>
          ) : (
             <div className="space-y-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-2xl font-bold" />
             </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditing ? (
            <>
              <div>
                <h3 className="font-semibold text-lg mb-1">Status</h3>
                <Select value={task.status} onValueChange={(value: 'pending' | 'in-progress' | 'completed') => handleStatusChange(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap break-words">
                  {task.description || <span className="italic">No description provided.</span>}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Created On</h3>
                <p className="text-xs text-gray-400">{creationDateFormatted}</p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
                <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea id="editDescription" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={5} />
                </div>
                <div>
                    <Label htmlFor="editDueDate">Due Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !editDueDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {editDueDate ? format(editDueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={editDueDate}
                            onSelect={setEditDueDate}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                    <Label htmlFor="editStatus">Status</Label>
                     <Select value={editStatus} onValueChange={(value: 'pending' | 'in-progress' | 'completed') => setEditStatus(value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Set status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          {isEditing ? (
            <div className="flex gap-2">
                <Button onClick={handleUpdateTask} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
                <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    // Reset edit fields to original task values
                    setEditTitle(task.title);
                    setEditDescription(task.description || '');
                    setEditDueDate(task.dueDate ? parseISO(task.dueDate) : undefined);
                    setEditStatus(task.status);
                }}>Cancel</Button>
            </div>
          ) : (
            <div /> // Placeholder para mantener el layout si no hay acciones
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading || isEditing}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task
                    &quot;{task.title}&quot;.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTask} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                     {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
