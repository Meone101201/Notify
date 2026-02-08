/**
 * Points Calculator Module
 * Handles all points and level calculations for the achievement system
 */

/**
 * Calculate points awarded for completing a task
 * @param {Object} task - The task object
 * @param {string|Date} completedDate - When the task was completed
 * @param {boolean} isOwner - Whether the user is the task owner
 * @returns {number} Points awarded for task completion
 */
function calculateTaskCompletionPoints(task, completedDate, isOwner) {
    if (!task || typeof task.storyPoint !== 'number') {
        return 0;
    }
    
    // Base points from story points
    let points = task.storyPoint;
    
    // Add early completion bonus if applicable
    const earlyBonus = calculateEarlyCompletionBonus(task, completedDate);
    points += earlyBonus;
    
    return points;
}

/**
 * Calculate points for completing subtasks as a collaborator
 * @param {Object} task - The task object
 * @param {boolean} isOwner - Whether the user is the task owner
 * @returns {number} Points awarded for subtask completion
 */
function calculateSubtaskPoints(task, isOwner) {
    if (!task || !Array.isArray(task.subtasks) || isOwner) {
        return 0;
    }
    
    // Count completed subtasks
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    
    // Calculate collaboration bonus
    return calculateCollaborationBonus(completedSubtasks);
}

/**
 * Calculate bonus points for completing a task before its due date
 * @param {Object} task - The task object
 * @param {string|Date} completedDate - When the task was completed
 * @returns {number} Bonus points (10% of story points if early)
 */
function calculateEarlyCompletionBonus(task, completedDate) {
    if (!task || !task.dueDate || !completedDate) {
        return 0;
    }
    
    const completed = new Date(completedDate);
    const due = new Date(task.dueDate);
    
    // Award bonus if completed before due date (not at exact time)
    if (completed < due) {
        return Math.floor(task.storyPoint * 0.1);
    }
    
    return 0;
}

/**
 * Calculate bonus points for helping friends complete subtasks
 * @param {number} completedSubtasks - Number of subtasks completed
 * @returns {number} Bonus points (5 points per subtask)
 */
function calculateCollaborationBonus(completedSubtasks) {
    if (typeof completedSubtasks !== 'number' || completedSubtasks < 0) {
        return 0;
    }
    
    return completedSubtasks * 5;
}

/**
 * Calculate user level from total points
 * Uses formula: Level = floor(sqrt(points / 100))
 * @param {number} points - Total points accumulated
 * @returns {number} User level
 */
function calculateLevel(points) {
    if (typeof points !== 'number' || points < 0) {
        return 0;
    }
    
    return Math.floor(Math.sqrt(points / 100));
}

/**
 * Calculate points needed to reach the next level
 * @param {number} currentLevel - Current user level
 * @returns {number} Points needed for next level
 */
function calculatePointsForNextLevel(currentLevel) {
    if (typeof currentLevel !== 'number' || currentLevel < 0) {
        return 100;
    }
    
    // Next level requires: (level + 1)^2 * 100 points
    const nextLevel = currentLevel + 1;
    return nextLevel * nextLevel * 100;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateTaskCompletionPoints,
        calculateSubtaskPoints,
        calculateEarlyCompletionBonus,
        calculateCollaborationBonus,
        calculateLevel,
        calculatePointsForNextLevel
    };
}
