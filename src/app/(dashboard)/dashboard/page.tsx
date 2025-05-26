"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Task } from '@/lib/types';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, PlusCircle, AlertTriangle } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // Re-añadido para el formulario
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date());
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchTasks = useCallback(async (date: Date | undefined) => {
    if (!isAuthenticated || !user) return;
    setIsLoadingTasks(true);
    setError(null);
    try {
      const dateString = date ? format(date, 'yyyy-MM-dd') : '';
      const response = await fetch(`/api/tasks?userId=${user.id}${dateString ? `&date=${dateString}` : ''}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add any other necessary headers, like Authorization tokens, if applicable
        }
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON or empty
          errorData = { error: `Request failed with status: ${response.statusText || response.status}` };
        }
        throw new Error(errorData.error || `Failed to fetch tasks: ${response.statusText}`);
      }

      const rawDataFromApi: any[] = await response.json();

      // Map API data (PascalCase) to the frontend Task type (camelCase/lowercase)
      const mappedTasks: Task[] = rawDataFromApi.map(apiTask => ({
        id: apiTask.TaskID,
        userId: apiTask.UserID,
        title: apiTask.Title,
        description: apiTask.Description,
        creationDate: apiTask.CreationDate, // Ensure these date strings are handled appropriately if conversion to Date objects is needed later
        dueDate: apiTask.DueDate,
        status: apiTask.Status, // This maps 'Status' (PascalCase) from API to 'status' (lowercase) for the frontend
      }));
      setTasks(mappedTasks);

    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Could not load tasks.");
      toast({
        variant: "destructive",
        title: "Error fetching tasks",
        description: err.message || "An unexpected error occurred.",
      });
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [user, isAuthenticated, toast]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTasks(selectedDate);
    }
  }, [isAuthenticated, user, selectedDate, fetchTasks]);

  const handleCreateTask = async () => {
    if (!user || !newTaskTitle || !newTaskDueDate) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title and Due Date are required for a new task.",
      });
      return;
    }
    setIsLoadingTasks(true); // Reutilizar para indicar actividad
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'x-user-id': String(user.UserID) // ¡IMPORTANTE! En una app real, userId vendría de la sesión/token
        },
        body: JSON.stringify({
          userId: user.id, // Pasando userId en el body, como se definió en la API
          title: newTaskTitle,
          description: newTaskDescription,
          dueDate: format(newTaskDueDate, 'yyyy-MM-dd'),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create task. Status: ${response.status}`);
      }
      // const { TaskID } = await response.json(); // El ID de la nueva tarea
      toast({
        title: "Task Created",
        description: `Task "${newTaskTitle}" has been successfully created.`,
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate(new Date());
      setIsCreateTaskOpen(false);
      fetchTasks(selectedDate); // Refrescar la lista de tareas
    } catch (err: any) {
      console.error("Error creating task:", err);
      toast({
        variant: "destructive",
        title: "Error Creating Task",
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoadingTasks(false);
    }
  };

  if (isLoadingAuth) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!isAuthenticated || !user) {
    // El layout ya debería redirigir, pero por si acaso.
    return <div className="flex h-screen items-center justify-center"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
        <h1 className="text-3xl font-bold text-primary">
          Tasks for {selectedDate ? format(selectedDate, 'PPP') : 'All Dates'}
        </h1>
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date (or all)</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                    setSelectedDate(date);
                    fetchTasks(date);
                }}
                initialFocus
              />
               <Button variant="ghost" className="w-full" onClick={() => {setSelectedDate(undefined); fetchTasks(undefined);}}>
                Show All Tasks
              </Button>
            </PopoverContent>
          </Popover>

          <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new task. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input id="title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea id="description" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dueDate" className="text-right">
                    Due Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "col-span-3 justify-start text-left font-normal",
                          !newTaskDueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTaskDueDate}
                        onSelect={setNewTaskDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                   <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={handleCreateTask} disabled={isLoadingTasks}>
                  {isLoadingTasks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {isLoadingTasks && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}
      {!isLoadingTasks && error && (
        <div className="my-6 rounded-md border border-destructive bg-destructive/10 p-4 text-center text-destructive">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5"/>
            <p className="font-semibold">Error loading tasks:</p>
          </div>
          <p>{error}</p>
          <Button variant="outline" onClick={() => fetchTasks(selectedDate)} className="mt-4">Try Again</Button>
        </div>
      )}
      {!isLoadingTasks && !error && tasks.length === 0 && (
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-xl">No tasks found for this date.</p>
          <p>Try selecting a different date or creating a new task.</p>
        </div>
      )}
      {!isLoadingTasks && !error && tasks.length > 0 && (
        <TaskList tasks={tasks} />
      )}
    </div>
  );
}
