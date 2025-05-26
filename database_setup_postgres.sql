-- Create Database (ejecuta este comando por separado en psql o tu cliente SQL si es necesario)
-- CREATE DATABASE TaskSPDB;

-- Conéctate a la base de datos (p. ej., \c TaskSPDB en psql)
-- El siguiente script asume que estás conectado a la base de datos correcta.

-- Habilita la extensión pgcrypto para el hash SHA256 si aún no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crea el tipo ENUM para el estado de la tarea
CREATE TYPE task_status_enum AS ENUM ('pending', 'in-progress', 'completed');

-- Crear Tabla Users
CREATE TABLE IF NOT EXISTS Users (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL, -- Almacena el hash SHA256 codificado en hexadecimal
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear Tabla Tasks
CREATE TABLE IF NOT EXISTS Tasks (
    TaskID SERIAL PRIMARY KEY,
    UserID INT NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    CreationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DueDate DATE,
    Status task_status_enum DEFAULT 'pending',
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- --- Funciones (anteriormente Stored Procedures) ---

-- FN_AuthenticateUser (antes SP_AuthenticateUser)
-- Propósito: Autentica un usuario basado en nombre de usuario y contraseña.
CREATE OR REPLACE FUNCTION FN_AuthenticateUser(
    p_Username VARCHAR(255),
    p_Password VARCHAR(255)
)
RETURNS TABLE("UserID" INT, "Username" VARCHAR(255))
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT U.UserID, U.Username
    FROM Users U
    WHERE U.Username = p_Username AND U.PasswordHash = encode(digest(p_Password, 'sha256'), 'hex');
END;
$$;

-- FN_RegisterUser (antes SP_RegisterUser)
-- Propósito: Registra un nuevo usuario.
-- Nota: Esta función ahora toma la contraseña en texto plano y la hashea internamente.
CREATE OR REPLACE FUNCTION FN_RegisterUser(
    p_Username VARCHAR(255),
    p_Password VARCHAR(255) -- Contraseña en texto plano, será hasheada
)
RETURNS INT -- Devuelve el nuevo UserID
LANGUAGE plpgsql
AS $$
DECLARE
    new_user_id INT;
BEGIN
    INSERT INTO Users (Username, PasswordHash)
    VALUES (p_Username, encode(digest(p_Password, 'sha256'), 'hex'))
    RETURNING UserID INTO new_user_id;
    RETURN new_user_id;
END;
$$;

-- FN_CreateTask (antes SP_CreateTask)
-- Propósito: Crea una nueva tarea para un usuario.
CREATE OR REPLACE FUNCTION FN_CreateTask(
    p_UserID INT,
    p_Title VARCHAR(255),
    p_Description TEXT,
    p_DueDate DATE
)
RETURNS INT -- Devuelve el nuevo TaskID
LANGUAGE plpgsql
AS $$
DECLARE
    new_task_id INT;
BEGIN
    INSERT INTO Tasks (UserID, Title, Description, DueDate, Status)
    VALUES (p_UserID, p_Title, p_Description, p_DueDate, 'pending')
    RETURNING TaskID INTO new_task_id;
    RETURN new_task_id;
END;
$$;

-- FN_GetTasksForUserByDate (antes SP_GetTasksForUserByDate)
-- Propósito: Recupera tareas para un usuario específico con vencimiento en una fecha específica.
-- Si p_TargetDate es NULL, recupera todas las tareas para el usuario.
CREATE OR REPLACE FUNCTION FN_GetTasksForUserByDate(
    p_UserID INT,
    p_TargetDate DATE
)
RETURNS TABLE (
    "TaskID" INT,
    "UserID" INT,
    "Title" VARCHAR(255),
    "Description" TEXT,
    "CreationDate" TIMESTAMP,
    "DueDate" DATE,
    "Status" task_status_enum
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_TargetDate IS NULL THEN
        RETURN QUERY
        SELECT T.TaskID, T.UserID, T.Title, T.Description, T.CreationDate, T.DueDate, T.Status
        FROM Tasks T
        WHERE T.UserID = p_UserID
        ORDER BY T.DueDate ASC, T.CreationDate DESC;
    ELSE
        RETURN QUERY
        SELECT T.TaskID, T.UserID, T.Title, T.Description, T.CreationDate, T.DueDate, T.Status
        FROM Tasks T
        WHERE T.UserID = p_UserID AND T.DueDate = p_TargetDate
        ORDER BY T.CreationDate DESC;
    END IF;
END;
$$;

-- FN_GetTaskDetails (antes SP_GetTaskDetails)
-- Propósito: Recupera detalles para una tarea específica, asegurando que pertenezca al usuario.
CREATE OR REPLACE FUNCTION FN_GetTaskDetails(
    p_TaskID INT,
    p_UserID INT
)
RETURNS TABLE (
    "TaskID" INT,
    "UserID" INT,
    "Title" VARCHAR(255),
    "Description" TEXT,
    "CreationDate" TIMESTAMP,
    "DueDate" DATE,
    "Status" task_status_enum
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT T.TaskID, T.UserID, T.Title, T.Description, T.CreationDate, T.DueDate, T.Status
    FROM Tasks T
    WHERE T.TaskID = p_TaskID AND T.UserID = p_UserID;
END;
$$;

-- FN_UpdateTask (antes SP_UpdateTask)
-- Propósito: Actualiza una tarea existente.
CREATE OR REPLACE FUNCTION FN_UpdateTask(
    p_TaskID INT,
    p_UserID INT,
    p_Title VARCHAR(255),
    p_Description TEXT,
    p_DueDate DATE,
    p_Status task_status_enum
)
RETURNS INTEGER -- Devuelve el número de filas actualizadas
LANGUAGE plpgsql
AS $$
DECLARE
    updated_rows_count INTEGER;
BEGIN
    UPDATE Tasks T
    SET
        Title = p_Title,
        Description = p_Description,
        DueDate = p_DueDate,
        Status = p_Status
    WHERE T.TaskID = p_TaskID AND T.UserID = p_UserID;
    GET DIAGNOSTICS updated_rows_count = ROW_COUNT;
    RETURN updated_rows_count;
END;
$$;

-- FN_UpdateTaskStatus (antes SP_UpdateTaskStatus)
-- Propósito: Actualiza el estado de una tarea específica.
CREATE OR REPLACE FUNCTION FN_UpdateTaskStatus(
    p_TaskID INT,
    p_UserID INT,
    p_NewStatus task_status_enum
)
RETURNS INTEGER -- Devuelve el número de filas actualizadas
LANGUAGE plpgsql
AS $$
DECLARE
    updated_rows_count INTEGER;
BEGIN
    UPDATE Tasks T
    SET Status = p_NewStatus
    WHERE T.TaskID = p_TaskID AND T.UserID = p_UserID;
    GET DIAGNOSTICS updated_rows_count = ROW_COUNT;
    RETURN updated_rows_count;
END;
$$;

-- FN_DeleteTask (antes SP_DeleteTask)
-- Propósito: Elimina una tarea para un usuario.
CREATE OR REPLACE FUNCTION FN_DeleteTask(
    p_TaskID INT,
    p_UserID INT
)
RETURNS INTEGER -- Devuelve el número de filas eliminadas
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_rows_count INTEGER;
BEGIN
    DELETE FROM Tasks T
    WHERE T.TaskID = p_TaskID AND T.UserID = p_UserID;
    GET DIAGNOSTICS deleted_rows_count = ROW_COUNT;
    RETURN deleted_rows_count;
END;
$$;

-- Crea extensión (si aún no existe)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Inserta usuario y obtiene su ID
SELECT public.fn_registeruser('testuser', 'password123') AS new_user_id;
