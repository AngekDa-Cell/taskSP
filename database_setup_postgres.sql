-- Create Database (ejecuta este comando por separado en psql o tu cliente SQL si es necesario)
-- CREATE DATABASE TaskSPDB;

-- Conéctate a la base de datos (p. ej., \c TaskSPDB en psql)
-- El siguiente script asume que estás conectado a la base de datos correcta.

-- Habilita la extensión pgcrypto para el hash SHA256 si aún no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crea el tipo ENUM para el estado de la tarea
DROP TYPE IF EXISTS task_status_enum CASCADE; -- Drop if exists to handle changes
CREATE TYPE task_status_enum AS ENUM ('pending', 'in-progress', 'completed');

-- Crear Tabla Users
DROP TABLE IF EXISTS Users CASCADE; -- Drop if exists for easier re-execution during dev
CREATE TABLE IF NOT EXISTS Users (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash TEXT NOT NULL, -- Storing hashed password
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear Tabla Tasks
DROP TABLE IF EXISTS Tasks CASCADE; -- Drop if exists for easier re-execution during dev
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

-- --- Stored Procedures ---

-- SP_AuthenticateUser
-- Propósito: Autentica un usuario basado en nombre de usuario y contraseña.
-- Devuelve UserID y Username si la autenticación es exitosa.
CREATE OR REPLACE PROCEDURE SP_AuthenticateUser(
    p_Username VARCHAR(255),
    p_Password VARCHAR(255),
    OUT o_UserID INT,
    OUT o_Username_Out VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT Users.UserID, Users.Username
    INTO o_UserID, o_Username_Out
    FROM Users
    WHERE Users.Username = p_Username AND Users.PasswordHash = encode(digest(p_Password, 'sha256'), 'hex');
END;
$$;

-- SP_RegisterUser
-- Propósito: Registra un nuevo usuario.
-- Devuelve el nuevo UserID.
CREATE OR REPLACE PROCEDURE SP_RegisterUser(
    p_Username VARCHAR(255),
    p_Password VARCHAR(255), -- Password to be hashed by the SP
    OUT o_NewUserID INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Users (Username, PasswordHash)
    VALUES (p_Username, encode(digest(p_Password, 'sha256'), 'hex'))
    RETURNING UserID INTO o_NewUserID;
END;
$$;

-- SP_CreateTask
-- Propósito: Crea una nueva tarea para un usuario.
-- Devuelve el nuevo TaskID. Status por defecto es 'pending'.
CREATE OR REPLACE PROCEDURE SP_CreateTask(
    p_UserID INT,
    p_Title VARCHAR(255),
    p_Description TEXT,
    p_DueDate DATE,
    -- p_Status task_status_enum DEFAULT 'pending', -- Status will default from table definition or can be added if API sends it
    OUT o_NewTaskID INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Tasks (UserID, Title, Description, DueDate) -- Status will use table default
    VALUES (p_UserID, p_Title, p_Description, p_DueDate)
    RETURNING TaskID INTO o_NewTaskID;
END;
$$;

-- SP_GetTasksForUserByDate
-- Propósito: Recupera tareas para un usuario específico con vencimiento en una fecha específica.
-- Si p_TargetDate es NULL, recupera todas las tareas para el usuario.
-- Devuelve un cursor con las tareas.
CREATE OR REPLACE PROCEDURE SP_GetTasksForUserByDate(
    p_UserID INT,
    p_TargetDate DATE, -- Puede ser NULL
    INOUT p_TasksCursor REFCURSOR DEFAULT 'taskcursor'
)
LANGUAGE plpgsql
AS $$
BEGIN
    OPEN p_TasksCursor FOR
        SELECT T.TaskID, T.UserID, T.Title, T.Description, T.CreationDate, T.DueDate, T.Status
        FROM Tasks T
        WHERE T.UserID = p_UserID
          AND (p_TargetDate IS NULL OR T.DueDate = p_TargetDate);
END;
$$;

-- SP_GetTaskDetails
-- Propósito: Recupera detalles para una tarea específica, asegurando que pertenezca al usuario.
CREATE OR REPLACE PROCEDURE SP_GetTaskDetails(
    p_TaskID_in INT,
    p_UserID_in INT,
    OUT o_Fetched_TaskID INT,
    OUT o_Title VARCHAR(255),
    OUT o_Description TEXT,
    OUT o_CreationDate TIMESTAMP,
    OUT o_DueDate DATE,
    OUT o_Status task_status_enum
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT T.TaskID, T.Title, T.Description, T.CreationDate, T.DueDate, T.Status
    INTO o_Fetched_TaskID, o_Title, o_Description, o_CreationDate, o_DueDate, o_Status
    FROM Tasks T
    WHERE T.TaskID = p_TaskID_in AND T.UserID = p_UserID_in;
END;
$$;

-- SP_UpdateTask
-- Propósito: Actualiza una tarea existente para un usuario.
-- Permite actualizar título, descripción, fecha de vencimiento y estado.
-- Devuelve el número de filas actualizadas (1 si éxito, 0 si no se encontró o no pertenece al usuario).
CREATE OR REPLACE PROCEDURE SP_UpdateTask(
    p_TaskID INT,
    p_UserID INT,
    p_Title VARCHAR(255),
    p_Description TEXT,
    p_DueDate DATE,
    p_Status task_status_enum,
    OUT o_updated_rows_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE Tasks
    SET
        Title = COALESCE(p_Title, Title),
        Description = COALESCE(p_Description, Description),
        DueDate = COALESCE(p_DueDate, DueDate),
        Status = COALESCE(p_Status, Status)
    WHERE TaskID = p_TaskID AND UserID = p_UserID;
    GET DIAGNOSTICS o_updated_rows_count = ROW_COUNT;
END;
$$;

-- SP_DeleteTask
-- Propósito: Elimina una tarea específica, asegurando que pertenezca al usuario.
-- Devuelve el número de filas eliminadas (1 si éxito, 0 si no se encontró o no pertenece al usuario).
CREATE OR REPLACE PROCEDURE SP_DeleteTask(
    p_TaskID INT,
    p_UserID INT,
    OUT o_deleted_rows_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM Tasks
    WHERE TaskID = p_TaskID AND UserID = p_UserID;
    GET DIAGNOSTICS o_deleted_rows_count = ROW_COUNT;
END;
$$;

DO $$
DECLARE
    v_new_user_id INT;
    v_auth_user_id INT;
    v_auth_username VARCHAR;
    v_task_id INT;
    v_rows_affected INT;
BEGIN
    -- Registrar un nuevo usuario
    CALL SP_RegisterUser('angel', 'test123', v_new_user_id);
    RAISE NOTICE 'Nuevo UserID registrado: %', v_new_user_id;
END $$ LANGUAGE plpgsql;



-- Ejemplo de cómo llamar a SP_RegisterUser y obtener el ID del nuevo usuario:
/*
DO $$
DECLARE
    v_new_user_id INT;
    v_auth_user_id INT;
    v_auth_username VARCHAR;
    v_task_id INT;
    v_rows_affected INT;
BEGIN
    -- Registrar un nuevo usuario
    CALL SP_RegisterUser('testuser_sp', 'securepassword123', v_new_user_id);
    RAISE NOTICE 'Nuevo UserID registrado: %', v_new_user_id;

    -- Autenticar el usuario
    IF v_new_user_id IS NOT NULL THEN
        CALL SP_AuthenticateUser('testuser_sp', 'securepassword123', v_auth_user_id, v_auth_username);
        IF v_auth_user_id IS NOT NULL THEN
            RAISE NOTICE 'Usuario autenticado: ID=%, Username=%', v_auth_user_id, v_auth_username;

            -- Crear una tarea para el usuario autenticado
            CALL SP_CreateTask(v_auth_user_id, 'Tarea de prueba SP', 'Descripción de la tarea de prueba SP', CURRENT_DATE + INTERVAL '7 days', v_task_id);
            RAISE NOTICE 'Nueva TaskID creada: %', v_task_id;

            -- Actualizar estado de la tarea
            IF v_task_id IS NOT NULL THEN
                CALL SP_UpdateTaskStatus(v_task_id, v_auth_user_id, 'in-progress', v_rows_affected);
                RAISE NOTICE 'Filas afectadas al actualizar estado: %', v_rows_affected;
            END IF;

        ELSE
            RAISE NOTICE 'Fallo la autenticación para testuser_sp';
        END IF;
    END IF;
END $$;

-- Ejemplo de cómo llamar a SP_GetTasksForUserByDate:
-- Es necesario estar en una transacción para usar cursores devueltos por procedimientos.
-- BEGIN;
-- CALL SP_GetTasksForUserByDate(v_auth_user_id, NULL, 'mycursor'); -- Reemplaza v_auth_user_id con un ID real
-- FETCH ALL FROM mycursor;
-- CLOSE mycursor;
-- COMMIT;
*/
