import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * /habit -h
 * A command for tracking habits
 * Usage: /habit [OPTIONS]
 * Options:
 * -e str  set custom event (leetcode, workout, ...)
 * -t str  set timezone (Asia/Shanghai, America/NewYork, ...)
 * -n str  notes or thoughts, enclosed by double quotes "
 * -h      display help message
 * -v      get current version
 * 
 * For more help on how to use this, head to https://aaa.bbb.ccc
 */

/**
 * /habit -v
 * 
 * Habit Tracker version 0.1.1, build 5650f9b
 * 
 */

/**
 * /habit -e leetcode -t Asia/Shanghai
 * 
 */

/**
 * /habit -n "This is a single line note"
 * 
 * /habit -n "This is a multiline note
 * Second line
 * Third line
 * "
 * 
 * /habit -n
 * "
 * # Content Title
 * ## Subtitle 
 * Paragraph
 * - Bullet point 1
 * "
 * 
 */