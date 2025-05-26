-- Create Database
CREATE DATABASE IF NOT EXISTS TaskSPDB;
USE TaskSPDB;

-- Create Users Table
CREATE TABLE IF NOT EXISTS Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL, -- In a real app, store a securely hashed password
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Tasks Table
CREATE TABLE IF NOT EXISTS Tasks (
    TaskID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    CreationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DueDate DATE,
    Status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- --- Stored Procedures ---

-- SP_AuthenticateUser
-- Purpose: Authenticates a user based on username and password.
-- Note: Password checking logic here is simplified. In a real app, use secure hashing and comparison.
DELIMITER //
CREATE PROCEDURE SP_AuthenticateUser(
    IN p_Username VARCHAR(255),
    IN p_Password VARCHAR(255) -- In a real app, this would be the plain password to be hashed and compared
)
BEGIN
    SELECT UserID, Username
    FROM Users
    WHERE Username = p_Username AND PasswordHash = SHA2(p_Password, 256); -- Example hashing, match your app's hashing
END //
DELIMITER ;

-- SP_RegisterUser
-- Purpose: Registers a new user.
DELIMITER //
CREATE PROCEDURE SP_RegisterUser(
    IN p_Username VARCHAR(255),
    IN p_PasswordHash VARCHAR(255)
)
BEGIN
    INSERT INTO Users (Username, PasswordHash)
    VALUES (p_Username, p_PasswordHash);
    SELECT LAST_INSERT_ID() AS UserID;
END //
DELIMITER ;

-- SP_CreateTask
-- Purpose: Creates a new task for a user.
DELIMITER //
CREATE PROCEDURE SP_CreateTask(
    IN p_UserID INT,
    IN p_Title VARCHAR(255),
    IN p_Description TEXT,
    IN p_DueDate DATE
)
BEGIN
    INSERT INTO Tasks (UserID, Title, Description, DueDate, Status)
    VALUES (p_UserID, p_Title, p_Description, p_DueDate, 'pending');
    SELECT LAST_INSERT_ID() AS TaskID;
END //
DELIMITER ;

-- SP_GetTasksForUserByDate
-- Purpose: Retrieves tasks for a specific user due on a specific date.
-- If p_Date is NULL, retrieve all tasks for the user.
DELIMITER //
CREATE PROCEDURE SP_GetTasksForUserByDate(
    IN p_UserID INT,
    IN p_TargetDate DATE
)
BEGIN
    IF p_TargetDate IS NULL THEN
        SELECT TaskID, UserID, Title, Description, CreationDate, DueDate, Status
        FROM Tasks
        WHERE UserID = p_UserID
        ORDER BY DueDate ASC, CreationDate DESC;
    ELSE
        SELECT TaskID, UserID, Title, Description, CreationDate, DueDate, Status
        FROM Tasks
        WHERE UserID = p_UserID AND DueDate = p_TargetDate
        ORDER BY CreationDate DESC;
    END IF;
END //
DELIMITER ;

-- SP_GetTaskDetails
-- Purpose: Retrieves details for a specific task, ensuring it belongs to the user.
DELIMITER //
CREATE PROCEDURE SP_GetTaskDetails(
    IN p_TaskID INT,
    IN p_UserID INT
)
BEGIN
    SELECT TaskID, UserID, Title, Description, CreationDate, DueDate, Status
    FROM Tasks
    WHERE TaskID = p_TaskID AND UserID = p_UserID;
END //
DELIMITER ;

-- SP_UpdateTask
-- Purpose: Updates an existing task.
DELIMITER //
CREATE PROCEDURE SP_UpdateTask(
    IN p_TaskID INT,
    IN p_UserID INT,
    IN p_Title VARCHAR(255),
    IN p_Description TEXT,
    IN p_DueDate DATE,
    IN p_Status ENUM('pending', 'in-progress', 'completed')
)
BEGIN
    UPDATE Tasks
    SET
        Title = p_Title,
        Description = p_Description,
        DueDate = p_DueDate,
        Status = p_Status
    WHERE TaskID = p_TaskID AND UserID = p_UserID;
    SELECT ROW_COUNT() AS UpdatedRows;
END //
DELIMITER ;

-- SP_UpdateTaskStatus
-- Purpose: Updates the status of a specific task.
DELIMITER //
CREATE PROCEDURE SP_UpdateTaskStatus(
    IN p_TaskID INT,
    IN p_UserID INT,
    IN p_NewStatus ENUM('pending', 'in-progress', 'completed')
)
BEGIN
    UPDATE Tasks
    SET Status = p_NewStatus
    WHERE TaskID = p_TaskID AND UserID = p_UserID;
    SELECT ROW_COUNT() AS UpdatedRows;
END //
DELIMITER ;

-- SP_DeleteTask
-- Purpose: Deletes a task for a user.
DELIMITER //
CREATE PROCEDURE SP_DeleteTask(
    IN p_TaskID INT,
    IN p_UserID INT
)
BEGIN
    DELETE FROM Tasks
    WHERE TaskID = p_TaskID AND UserID = p_UserID;
    SELECT ROW_COUNT() AS DeletedRows;
END //
DELIMITER ;

-- --- Sample Data (Optional) ---
-- INSERT INTO Users (Username, PasswordHash) VALUES ('testuser', SHA2('password123', 256)); -- Example, use your hashing method
-- SET @testUserID = (SELECT UserID FROM Users WHERE Username = 'testuser');
-- INSERT INTO Tasks (UserID, Title, Description, DueDate, Status) VALUES 
-- (@testUserID, 'Grocery Shopping', 'Buy milk, eggs, and bread.', CURDATE(), 'pending'),
-- (@testUserID, 'Project Report', 'Finalize Q3 project report.', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'in-progress'),
-- (@testUserID, 'Book Doctor Appointment', 'Annual check-up.', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'pending');

-- Example calls (for testing in SQL client):
-- CALL SP_AuthenticateUser('testuser', 'password123');
-- CALL SP_CreateTask(@testUserID, 'New Task Title', 'New task description.', CURDATE());
-- CALL SP_GetTasksForUserByDate(@testUserID, CURDATE());
-- CALL SP_GetTaskDetails(1, @testUserID); -- Assuming task ID 1 exists for this user
-- CALL SP_UpdateTaskStatus(1, @testUserID, 'completed');
-- CALL SP_DeleteTask(1, @testUserID);
