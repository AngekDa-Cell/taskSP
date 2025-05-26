"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mock_SP_GetTasksForUserByDate } from '@/lib/mock-data';
import type { Task } from '@/lib/types';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
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
import { useToast } from '@/hooks/use-toast';
import { mock_SP_CreateTask } from '@/lib/mock-data';


export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date());
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const { toast } = useToast();


  const fetchTasks = async (date: Date | undefined) => {
    if (user && date) {
      setIsLoadingTasks(true);
      const dateString = format(date, 'yyyy-MM-dd');
      const fetchedTasks = await mock_SP_GetTasksForUserByDate(user.id, dateString);
      setTasks(fetchedTasks);
      setIsLoadingTasks(false);
    } else {
      setTasks([]);
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks(selectedDate);
  }, [user, selectedDate]);

  const handleCreateTask = async () => {
    if (!user || !newTaskTitle || !newTaskDueDate) {
      toast({ variant: "destructive", title: "Error", description: "Title and Due Date are required." });
      return;
    }
    setIsCreatingTask(true);
    try {
      await mock_SP_CreateTask(user.id, newTaskTitle, newTaskDescription, format(newTaskDueDate, 'yyyy-MM-dd'));
      toast({ title: "Success", description: "Task created successfully." });
      setIsAddTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      // Refetch tasks for the currently selected date
      if (selectedDate && format(newTaskDueDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) {
        fetchTasks(selectedDate);
      } else if (!selectedDate && newTaskDueDate.toDateString() === new Date().toDateString()) {
        // If no date was selected (defaulting to today) and new task is for today
        fetchTasks(new Date());
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create task." });
    } finally {
      setIsCreatingTask(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">
          Tasks for {selectedDate ? format(selectedDate, "PPP") : "Today"}
        </h1>
        <div className="flex items-center gap-4">
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
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new task. Click save when you're done.
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
                <Button onClick={handleCreateTask} disabled={isCreatingTask}>
                  {isCreatingTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoadingTasks ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <TaskList tasks={tasks} title={`Tasks for ${selectedDate ? format(selectedDate, "PPP") : "Today"}`} />
      )}
    </div>
  );
}
