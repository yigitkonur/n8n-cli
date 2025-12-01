/**
 * Node-Specific Validators
 * 
 * Provides detailed validation logic for commonly used n8n nodes.
 * Each validator understands the specific requirements and patterns of its node.
 * Ported from n8n-mcp/src/services/node-specific-validators.ts
 */

import type { NodeValidationContext, ValidationError, ValidationWarning } from './types.js';
import { shouldSkipLiteralValidation } from './expression-utils.js';

export class NodeSpecificValidators {
  // ========== Slack Validators ==========

  /**
   * Validate Slack node configuration with operation awareness
   */
  static validateSlack(context: NodeValidationContext): void {
    const { config, errors, warnings: _warnings, autofix: _autofix } = context;
    const resource = config.resource as string | undefined;
    const operation = config.operation as string | undefined;

    // Message operations
    if (resource === 'message') {
      switch (operation) {
        case 'send':
          this.validateSlackSendMessage(context);
          break;
        case 'update':
          this.validateSlackUpdateMessage(context);
          break;
        case 'delete':
          this.validateSlackDeleteMessage(context);
          break;
        default:
          // No specific validation for other operations
          break;
      }
    }

    // Channel operations
    else if (resource === 'channel') {
      if (operation === 'create') {
        this.validateSlackCreateChannel(context);
      }
    }

    // User operations
    else if (resource === 'user') {
      if (operation === 'get' && !config.user) {
        errors.push({
          type: 'missing_required',
          property: 'user',
          message: 'User identifier required - use email, user ID, or username',
          fix: 'Set user to an email like "john@example.com" or user ID like "U1234567890"',
        });
      }
    }

    // Error handling for Slack operations
    this.addSlackErrorHandling(context);
  }

  private static validateSlackSendMessage(context: NodeValidationContext): void {
    const { config, errors, warnings, suggestions, autofix } = context;

    // Channel is required
    if (!config.channel && !config.channelId) {
      errors.push({
        type: 'missing_required',
        property: 'channel',
        message: 'Channel is required to send a message',
        fix: 'Set channel to a channel name (e.g., "#general") or ID (e.g., "C1234567890")',
      });
    }

    // Message content validation
    if (!config.text && !config.blocks && !config.attachments) {
      errors.push({
        type: 'missing_required',
        property: 'text',
        message: 'Message content is required - provide text, blocks, or attachments',
        fix: 'Add text field with your message content',
      });
    }

    // Character limit check
    const text = config.text as string | undefined;
    if (text && text.length > 40000) {
      warnings.push({
        type: 'inefficient',
        property: 'text',
        message: "Message text exceeds Slack's 40,000 character limit",
        suggestion: 'Split into multiple messages or use a file upload',
      });
    }

    // Thread reply validation
    if (config.replyToThread && !config.threadTs) {
      warnings.push({
        type: 'missing_common',
        property: 'threadTs',
        message: 'Thread timestamp required when replying to thread',
        suggestion: 'Set threadTs to the timestamp of the thread parent message',
      });
    }

    // Mention handling
    if (text?.includes('@') && !config.linkNames) {
      suggestions.push('Set linkNames=true to convert @mentions to user links');
      autofix.linkNames = true;
    }
  }

  private static validateSlackUpdateMessage(context: NodeValidationContext): void {
    const { config, errors } = context;

    if (!config.ts) {
      errors.push({
        type: 'missing_required',
        property: 'ts',
        message: 'Message timestamp (ts) is required to update a message',
        fix: 'Provide the timestamp of the message to update',
      });
    }

    if (!config.channel && !config.channelId) {
      errors.push({
        type: 'missing_required',
        property: 'channel',
        message: 'Channel is required to update a message',
        fix: 'Provide the channel where the message exists',
      });
    }
  }

  private static validateSlackDeleteMessage(context: NodeValidationContext): void {
    const { config, errors, warnings } = context;

    if (!config.ts) {
      errors.push({
        type: 'missing_required',
        property: 'ts',
        message: 'Message timestamp (ts) is required to delete a message',
        fix: 'Provide the timestamp of the message to delete',
      });
    }

    if (!config.channel && !config.channelId) {
      errors.push({
        type: 'missing_required',
        property: 'channel',
        message: 'Channel is required to delete a message',
        fix: 'Provide the channel where the message exists',
      });
    }

    warnings.push({
      type: 'security',
      message: 'Message deletion is permanent and cannot be undone',
      suggestion: 'Consider archiving or updating the message instead',
    });
  }

  private static validateSlackCreateChannel(context: NodeValidationContext): void {
    const { config, errors } = context;
    const name = config.name as string | undefined;

    if (!name) {
      errors.push({
        type: 'missing_required',
        property: 'name',
        message: 'Channel name is required',
        fix: 'Provide a channel name (lowercase, no spaces, 1-80 characters)',
      });
    } else {
      if (name.includes(' ')) {
        errors.push({
          type: 'invalid_value',
          property: 'name',
          message: 'Channel names cannot contain spaces',
          fix: 'Use hyphens or underscores instead of spaces',
        });
      }
      if (name !== name.toLowerCase()) {
        errors.push({
          type: 'invalid_value',
          property: 'name',
          message: 'Channel names must be lowercase',
          fix: 'Convert the channel name to lowercase',
        });
      }
      if (name.length > 80) {
        errors.push({
          type: 'invalid_value',
          property: 'name',
          message: 'Channel name exceeds 80 character limit',
          fix: 'Shorten the channel name',
        });
      }
    }
  }

  private static addSlackErrorHandling(context: NodeValidationContext): void {
    const { config, warnings, autofix } = context;

    if (!config.onError && !config.retryOnFail && !config.continueOnFail) {
      warnings.push({
        type: 'best_practice',
        property: 'errorHandling',
        message: 'Slack API can have rate limits and transient failures',
        suggestion: 'Add onError: "continueRegularOutput" with retryOnFail for resilience',
      });
      autofix.onError = 'continueRegularOutput';
      autofix.retryOnFail = true;
      autofix.maxTries = 2;
      autofix.waitBetweenTries = 3000;
    }

    // Check for deprecated continueOnFail
    if (config.continueOnFail !== undefined) {
      warnings.push({
        type: 'deprecated',
        property: 'continueOnFail',
        message: 'continueOnFail is deprecated. Use onError instead',
        suggestion: 'Replace with onError: "continueRegularOutput"',
      });
    }
  }

  // ========== HTTP Request Validator ==========

  /**
   * Validate HTTP Request node configuration
   */
  static validateHttpRequest(context: NodeValidationContext): void {
    const { config, errors, warnings, suggestions, autofix } = context;
    const method = (config.method as string) || 'GET';
    const url = config.url as string | undefined;
    const sendBody = config.sendBody as boolean | undefined;
    const authentication = config.authentication as string | undefined;

    // URL validation
    if (!url) {
      errors.push({
        type: 'missing_required',
        property: 'url',
        message: 'URL is required for HTTP requests',
        fix: 'Provide the full URL including protocol (https://...)',
      });
    } else if (!shouldSkipLiteralValidation(url)) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        errors.push({
          type: 'invalid_value',
          property: 'url',
          message: 'URL must start with http:// or https://',
          fix: 'Add https:// to the beginning of your URL',
        });
      }
    }

    // Method-specific validation
    if (['POST', 'PUT', 'PATCH'].includes(method) && !sendBody) {
      warnings.push({
        type: 'missing_common',
        property: 'sendBody',
        message: `${method} requests typically include a body`,
        suggestion: 'Set sendBody: true and configure the body content',
      });
      autofix.sendBody = true;
      autofix.contentType = 'json';
    }

    // Authentication warnings
    if (url && url.includes('api') && !authentication) {
      warnings.push({
        type: 'security',
        property: 'authentication',
        message: 'API endpoints typically require authentication',
        suggestion: 'Configure authentication method (Bearer token, API key, etc.)',
      });
    }

    // JSON body validation
    if (sendBody && config.contentType === 'json' && config.jsonBody) {
      const jsonBody = config.jsonBody as string;
      if (!shouldSkipLiteralValidation(jsonBody)) {
        try {
          JSON.parse(jsonBody);
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown parsing error';
          errors.push({
            type: 'invalid_value',
            property: 'jsonBody',
            message: `jsonBody contains invalid JSON: ${errorMsg}`,
            fix: 'Fix JSON syntax error and ensure valid JSON format',
          });
        }
      }
    }

    // Error handling
    if (!config.onError && !config.retryOnFail && !config.continueOnFail) {
      warnings.push({
        type: 'best_practice',
        property: 'errorHandling',
        message: 'HTTP requests can fail due to network issues or server errors',
        suggestion: 'Add onError: "continueRegularOutput" and retryOnFail: true for resilience',
      });
      autofix.onError = 'continueRegularOutput';
      autofix.retryOnFail = true;
      autofix.maxTries = 3;
      autofix.waitBetweenTries = 1000;
    }

    // Timeout recommendation
    if (!config.timeout) {
      suggestions.push('Consider setting a timeout to prevent hanging requests');
    }
  }

  // ========== Webhook Validator ==========

  /**
   * Validate Webhook node configuration
   */
  static validateWebhook(context: NodeValidationContext): void {
    const { config, errors, warnings, suggestions, autofix } = context;
    const path = config.path as string | undefined;

    // Path validation
    if (!path) {
      errors.push({
        type: 'missing_required',
        property: 'path',
        message: 'Webhook path is required',
        fix: 'Provide a unique path like "my-webhook" or "github-events"',
      });
    } else if (path.startsWith('/')) {
      warnings.push({
        type: 'invalid_value',
        property: 'path',
        message: 'Webhook path should not start with /',
        suggestion: 'Use "webhook-name" instead of "/webhook-name"',
      });
    }

    // Error handling for webhooks
    if (!config.onError && !config.continueOnFail) {
      warnings.push({
        type: 'best_practice',
        property: 'onError',
        message: 'Webhooks should always send a response, even on error',
        suggestion: 'Set onError: "continueRegularOutput" to ensure webhook responses',
      });
      autofix.onError = 'continueRegularOutput';
    }

    // Security suggestions
    suggestions.push('Consider adding webhook validation (HMAC signature verification)');
    suggestions.push('Implement rate limiting for public webhooks');
  }

  // ========== Code Node Validator ==========

  /**
   * Validate Code node configuration
   */
  static validateCode(context: NodeValidationContext): void {
    const { config, errors, warnings, suggestions, autofix } = context;
    const language = (config.language as string) || 'javaScript';
    const codeField = language === 'python' ? 'pythonCode' : 'jsCode';
    const code = config[codeField] as string | undefined;

    // Check for empty code
    if (!code || code.trim() === '') {
      errors.push({
        type: 'missing_required',
        property: codeField,
        message: 'Code cannot be empty',
        fix: 'Add your code logic. Start with: return [{json: {result: "success"}}]',
      });
      return;
    }

    // Return statement validation
    if (!/return\s+/.test(code)) {
      errors.push({
        type: 'missing_required',
        property: codeField,
        message: 'Code must return data for the next node',
        fix:
          language === 'python'
            ? 'Add: return [{"json": {"result": "success"}}]'
            : 'Add: return [{json: {result: "success"}}]',
      });
    }

    // Security checks
    if (code.includes('eval(') || code.includes('exec(')) {
      warnings.push({
        type: 'security',
        message: 'Code contains eval/exec which can be a security risk',
        suggestion: 'Avoid using eval/exec with untrusted input',
      });
    }

    // n8n-specific pattern checks
    if (language === 'javaScript') {
      this.validateJavaScriptCode(code, errors, warnings, suggestions);
    } else if (language === 'python') {
      this.validatePythonCode(code, errors, warnings, suggestions);
    }

    // Error handling recommendation
    if (!config.onError && code.length > 100) {
      warnings.push({
        type: 'best_practice',
        property: 'errorHandling',
        message: 'Code nodes can throw errors - consider error handling',
        suggestion: 'Add onError: "continueRegularOutput" to handle errors gracefully',
      });
      autofix.onError = 'continueRegularOutput';
    }
  }

  private static validateJavaScriptCode(
    code: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    _suggestions: string[]
  ): void {
    // Check for input data access
    if (!code.includes('items') && !code.includes('$input') && !code.includes('$json')) {
      warnings.push({
        type: 'missing_common',
        message: "Code doesn't reference input data",
        suggestion: 'Access input with: items, $input.all(), or $json (in single-item mode)',
      });
    }

    // Check for $json usage without mode
    if (code.includes('$json') && !code.includes('mode')) {
      warnings.push({
        type: 'best_practice',
        message: '$json only works in "Run Once for Each Item" mode',
        suggestion: 'For all items mode, use: items[0].json or loop through items',
      });
    }

    // Check for incorrect helpers usage
    if (code.includes('$helpers.getWorkflowStaticData')) {
      errors.push({
        type: 'invalid_value',
        property: 'jsCode',
        message: '$helpers.getWorkflowStaticData() will cause "$helpers is not defined" error',
        fix: 'Use $getWorkflowStaticData("global") or $getWorkflowStaticData("node") directly',
      });
    }
  }

  private static validatePythonCode(
    code: string,
    errors: ValidationError[],
    _warnings: ValidationWarning[],
    _suggestions: string[]
  ): void {
    // Check for unavailable imports
    const unavailableImports = ['requests', 'pandas', 'numpy', 'pip'];
    for (const module of unavailableImports) {
      if (code.includes(`import ${module}`) || code.includes(`from ${module}`)) {
        errors.push({
          type: 'invalid_value',
          property: 'pythonCode',
          message: `Module '${module}' is not available in Code nodes`,
          fix: 'Use JavaScript Code node with $helpers.httpRequest for HTTP requests',
        });
      }
    }

    // Check indentation consistency
    const lines = code.split('\n');
    const indentTypes = new Set<string>();
    for (const line of lines) {
      const indent = line.match(/^(\s+)/);
      if (indent) {
        if (indent[1].includes('\t')) {indentTypes.add('tabs');}
        if (indent[1].includes(' ')) {indentTypes.add('spaces');}
      }
    }
    if (indentTypes.size > 1) {
      errors.push({
        type: 'syntax_error',
        property: 'pythonCode',
        message: 'Mixed indentation (tabs and spaces)',
        fix: 'Use either tabs or spaces consistently, not both',
      });
    }
  }

  // ========== Database Validators ==========

  /**
   * Validate Postgres node configuration
   */
  static validatePostgres(context: NodeValidationContext): void {
    const { config, errors, warnings: _warnings, suggestions, autofix: _autofix } = context;
    const operation = config.operation as string | undefined;

    // Common query validation
    if (['execute', 'select', 'insert', 'update', 'delete'].includes(operation || '')) {
      this.validateSQLQuery(context, 'postgres');
    }

    // Operation-specific validation
    switch (operation) {
      case 'insert':
      case 'update':
      case 'delete':
        if (!config.table) {
          errors.push({
            type: 'missing_required',
            property: 'table',
            message: `Table name is required for ${operation} operation`,
            fix: `Specify the table to ${operation} data ${operation === 'delete' ? 'from' : 'into'}`,
          });
        }
        break;

      case 'execute':
        if (!config.query) {
          errors.push({
            type: 'missing_required',
            property: 'query',
            message: 'SQL query is required',
            fix: 'Provide the SQL query to execute',
          });
        }
        break;
      default:
        // No specific validation for other operations
        break;
    }

    // Connection timeout suggestion
    if (config.connectionTimeout === undefined) {
      suggestions.push('Consider setting connectionTimeout to handle slow connections');
    }

    // Error handling
    this.addDatabaseErrorHandling(context, operation);
  }

  /**
   * Validate MySQL node configuration
   */
  static validateMySQL(context: NodeValidationContext): void {
    const { config, errors, warnings: _warnings, suggestions } = context;
    const operation = config.operation as string | undefined;

    // Similar to Postgres
    if (['execute', 'insert', 'update', 'delete'].includes(operation || '')) {
      this.validateSQLQuery(context, 'mysql');
    }

    // Operation-specific validation
    switch (operation) {
      case 'insert':
      case 'update':
      case 'delete':
        if (!config.table) {
          errors.push({
            type: 'missing_required',
            property: 'table',
            message: `Table name is required for ${operation} operation`,
            fix: `Specify the table to ${operation}`,
          });
        }
        break;

      case 'execute':
        if (!config.query) {
          errors.push({
            type: 'missing_required',
            property: 'query',
            message: 'SQL query is required',
            fix: 'Provide the SQL query to execute',
          });
        }
        break;
      default:
        // No specific validation for other operations
        break;
    }

    // MySQL-specific
    if (config.timezone === undefined) {
      suggestions.push('Consider setting timezone to ensure consistent date/time handling');
    }

    // Error handling
    this.addDatabaseErrorHandling(context, operation);
  }

  private static validateSQLQuery(
    context: NodeValidationContext,
    _dbType: 'postgres' | 'mysql'
  ): void {
    const { config, errors, warnings, suggestions } = context;
    const query = (config.query as string) || '';

    if (!query) {return;}

    const lowerQuery = query.toLowerCase();

    // SQL injection checks
    if (query.includes('${') || query.includes('{{')) {
      warnings.push({
        type: 'security',
        message: 'Query contains template expressions that might be vulnerable to SQL injection',
        suggestion: 'Use parameterized queries with query parameters instead of string interpolation',
      });
    }

    // DELETE without WHERE
    if (lowerQuery.includes('delete') && !lowerQuery.includes('where')) {
      errors.push({
        type: 'invalid_value',
        property: 'query',
        message: 'DELETE query without WHERE clause will delete all records',
        fix: 'Add a WHERE clause to specify which records to delete',
      });
    }

    // UPDATE without WHERE
    if (lowerQuery.includes('update') && !lowerQuery.includes('where')) {
      warnings.push({
        type: 'security',
        message: 'UPDATE query without WHERE clause will update all records',
        suggestion: 'Add a WHERE clause to specify which records to update',
      });
    }

    // DROP warning
    if (lowerQuery.includes('drop')) {
      errors.push({
        type: 'invalid_value',
        property: 'query',
        message: 'DROP operations are extremely dangerous and will permanently delete database objects',
        fix: 'Use this only if you really intend to delete tables/databases permanently',
      });
    }

    // SELECT * suggestion
    if (lowerQuery.includes('select *')) {
      suggestions.push('Consider selecting specific columns instead of * for better performance');
    }
  }

  private static addDatabaseErrorHandling(
    context: NodeValidationContext,
    operation: string | undefined
  ): void {
    const { config, warnings, autofix } = context;

    if (!config.onError && !config.retryOnFail && !config.continueOnFail) {
      if (operation === 'execute') {
        warnings.push({
          type: 'best_practice',
          property: 'errorHandling',
          message: 'Database queries can fail due to connection issues',
          suggestion: 'Add onError: "continueRegularOutput" and retryOnFail: true',
        });
        autofix.onError = 'continueRegularOutput';
        autofix.retryOnFail = true;
        autofix.maxTries = 3;
      } else if (['insert', 'update', 'delete'].includes(operation || '')) {
        warnings.push({
          type: 'best_practice',
          property: 'errorHandling',
          message: 'Database modifications should handle errors carefully',
          suggestion: 'Add onError: "stopWorkflow" with retryOnFail for transient failures',
        });
        autofix.onError = 'stopWorkflow';
        autofix.retryOnFail = true;
        autofix.maxTries = 2;
      }
    }
  }

  // ========== OpenAI Validator ==========

  /**
   * Validate OpenAI node configuration
   */
  static validateOpenAI(context: NodeValidationContext): void {
    const { config, errors, warnings, autofix } = context;
    const resource = config.resource as string | undefined;
    const operation = config.operation as string | undefined;

    if (resource === 'chat' && operation === 'create') {
      // Model validation
      if (!config.model) {
        errors.push({
          type: 'missing_required',
          property: 'model',
          message: 'Model selection is required',
          fix: 'Choose a model like "gpt-4", "gpt-3.5-turbo", etc.',
        });
      } else {
        const model = config.model as string;
        const deprecatedModels = ['text-davinci-003', 'text-davinci-002'];
        if (deprecatedModels.includes(model)) {
          warnings.push({
            type: 'deprecated',
            property: 'model',
            message: `Model ${model} is deprecated`,
            suggestion: 'Use "gpt-3.5-turbo" or "gpt-4" instead',
          });
        }
      }

      // Message validation
      if (!config.messages && !config.prompt) {
        errors.push({
          type: 'missing_required',
          property: 'messages',
          message: 'Messages or prompt required for chat completion',
          fix: 'Add messages array or use the prompt field',
        });
      }

      // Temperature validation
      const temperature = config.temperature as number | undefined;
      if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
        errors.push({
          type: 'invalid_value',
          property: 'temperature',
          message: 'Temperature must be between 0 and 2',
          fix: 'Set temperature between 0 (deterministic) and 2 (creative)',
        });
      }
    }

    // Error handling for AI API calls
    if (!config.onError && !config.retryOnFail && !config.continueOnFail) {
      warnings.push({
        type: 'best_practice',
        property: 'errorHandling',
        message: 'AI APIs have rate limits and can return errors',
        suggestion: 'Add onError: "continueRegularOutput" with retryOnFail and longer wait times',
      });
      autofix.onError = 'continueRegularOutput';
      autofix.retryOnFail = true;
      autofix.maxTries = 3;
      autofix.waitBetweenTries = 5000;
    }
  }

  // ========== Google Sheets Validator ==========

  /**
   * Validate Google Sheets node configuration
   */
  static validateGoogleSheets(context: NodeValidationContext): void {
    const { config, errors, warnings, suggestions: _suggestions, autofix } = context;
    const operation = config.operation as string | undefined;

    // Operation-specific validations
    switch (operation) {
      case 'append': {
        if (!config.range && !config.columns) {
          errors.push({
            type: 'missing_required',
            property: 'range',
            message: 'Range or columns mapping is required for append operation',
            fix: 'Specify range like "Sheet1!A:B" OR use columns with mappingMode',
          });
        }
        const options = config.options as Record<string, unknown> | undefined;
        if (!options?.valueInputMode) {
          warnings.push({
            type: 'missing_common',
            property: 'options.valueInputMode',
            message: 'Consider setting valueInputMode for proper data formatting',
            suggestion: 'Use "USER_ENTERED" to parse formulas and dates, or "RAW" for literal values',
          });
          autofix.options = { ...(options || {}), valueInputMode: 'USER_ENTERED' };
        }
        break;
      }

      case 'read':
        if (!config.range) {
          errors.push({
            type: 'missing_required',
            property: 'range',
            message: 'Range is required for read operation',
            fix: 'Specify range like "Sheet1!A:B" or "Sheet1!A1:B10"',
          });
        }
        break;

      case 'update':
        if (!config.range) {
          errors.push({
            type: 'missing_required',
            property: 'range',
            message: 'Range is required for update operation',
            fix: 'Specify the exact range to update like "Sheet1!A1:B10"',
          });
        }
        break;

      case 'delete':
        if (!config.toDelete) {
          errors.push({
            type: 'missing_required',
            property: 'toDelete',
            message: 'Specify what to delete (rows or columns)',
            fix: 'Set toDelete to "rows" or "columns"',
          });
        }
        warnings.push({
          type: 'security',
          message: 'Deletion is permanent. Consider backing up data first',
          suggestion: 'Read the data before deletion to create a backup',
        });
        break;
      default:
        // No specific validation for other operations
        break;
    }

    // Range format validation
    const range = config.range as string | undefined;
    if (range) {
      if (!range.includes('!')) {
        warnings.push({
          type: 'inefficient',
          property: 'range',
          message: 'Range should include sheet name for clarity',
          suggestion: 'Format: "SheetName!A1:B10" or "SheetName!A:B"',
        });
      }
      if (range.includes(' ') && !range.match(/^'[^']+'/)) {
        errors.push({
          type: 'invalid_value',
          property: 'range',
          message: 'Sheet names with spaces must be quoted',
          fix: "Use single quotes around sheet name: 'Sheet Name'!A1:B10",
        });
      }
    }
  }

  // ========== Set Node Validator ==========

  /**
   * Validate Set node configuration
   */
  static validateSet(context: NodeValidationContext): void {
    const { config, errors, warnings } = context;
    const jsonOutput = config.jsonOutput as string | undefined;

    // Validate jsonOutput when present
    if (jsonOutput !== undefined && jsonOutput !== null && jsonOutput !== '') {
      try {
        const parsed = JSON.parse(jsonOutput);

        // Set node expects an OBJECT, not an ARRAY
        if (Array.isArray(parsed)) {
          errors.push({
            type: 'invalid_value',
            property: 'jsonOutput',
            message: 'Set node expects a JSON object {}, not an array []',
            fix: 'Either wrap array items as object properties: {"items": [...]}, OR use a different approach',
          });
        }

        // Warn about empty objects
        if (typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0) {
          warnings.push({
            type: 'inefficient',
            property: 'jsonOutput',
            message: 'jsonOutput is an empty object - this node will output no data',
            suggestion: 'Add properties to the object or remove this node if not needed',
          });
        }
      } catch (e) {
        errors.push({
          type: 'syntax_error',
          property: 'jsonOutput',
          message: `Invalid JSON in jsonOutput: ${e instanceof Error ? e.message : 'Syntax error'}`,
          fix: 'Ensure jsonOutput contains valid JSON syntax',
        });
      }
    }

    // Validate mode-specific requirements
    if (config.mode === 'manual') {
      const hasFields = config.values && Object.keys(config.values as object).length > 0;
      if (!hasFields && !jsonOutput) {
        warnings.push({
          type: 'missing_common',
          message: 'Set node has no fields configured - will output empty items',
          suggestion: 'Add fields in the Values section or use JSON mode',
        });
      }
    }
  }

  // ========== MongoDB Validator ==========

  /**
   * Validate MongoDB node configuration
   */
  static validateMongoDB(context: NodeValidationContext): void {
    const { config, errors, warnings, autofix } = context;
    const operation = config.operation as string | undefined;

    // Collection is always required
    if (!config.collection) {
      errors.push({
        type: 'missing_required',
        property: 'collection',
        message: 'Collection name is required',
        fix: 'Specify the MongoDB collection to work with',
      });
    }

    switch (operation) {
      case 'find': {
        // Query validation
        const query = config.query as string | undefined;
        if (query) {
          try {
            JSON.parse(query);
          } catch {
            errors.push({
              type: 'invalid_value',
              property: 'query',
              message: 'Query must be valid JSON',
              fix: 'Ensure query is valid JSON like: {"name": "John"}',
            });
          }
        }
        break;
      }

      case 'insert':
        if (!config.fields && !config.documents) {
          errors.push({
            type: 'missing_required',
            property: 'fields',
            message: 'Document data is required for insert',
            fix: 'Provide the data to insert',
          });
        }
        break;

      case 'update':
        if (!config.query) {
          warnings.push({
            type: 'security',
            message: 'Update without query will affect all documents',
            suggestion: 'Add a query to target specific documents',
          });
        }
        break;

      case 'delete':
        if (!config.query || config.query === '{}') {
          errors.push({
            type: 'invalid_value',
            property: 'query',
            message: 'Delete without query would remove all documents - this is a critical security issue',
            fix: 'Add a query to specify which documents to delete',
          });
        }
        break;
      default:
        // No specific validation for other operations
        break;
    }

    // Error handling
    if (!config.onError && !config.retryOnFail && !config.continueOnFail) {
      warnings.push({
        type: 'best_practice',
        property: 'errorHandling',
        message: 'MongoDB operations can fail due to connection issues',
        suggestion: 'Add onError: "continueRegularOutput" with retryOnFail',
      });
      autofix.onError = 'continueRegularOutput';
      autofix.retryOnFail = true;
      autofix.maxTries = 3;
    }
  }

  // ========== AI Agent Validator ==========

  /**
   * Validate AI Agent node configuration
   */
  static validateAIAgent(context: NodeValidationContext): void {
    const { config, errors, warnings, suggestions, autofix } = context;

    // Check prompt type configuration
    if (config.promptType === 'define') {
      const text = config.text as string | undefined;
      if (!text || text.trim() === '') {
        errors.push({
          type: 'missing_required',
          property: 'text',
          message: 'Custom prompt text is required when promptType is "define"',
          fix: 'Provide a custom prompt in the text field, or change promptType to "auto"',
        });
      }
    }

    // Check system message
    const systemMessage = config.systemMessage as string | undefined;
    if (!systemMessage || systemMessage.trim() === '') {
      suggestions.push(
        "AI Agent works best with a system message that defines the agent's role, capabilities, and constraints."
      );
    } else if (systemMessage.length < 20) {
      warnings.push({
        type: 'inefficient',
        property: 'systemMessage',
        message: 'System message is very short (< 20 characters)',
        suggestion: "Consider a more detailed system message to guide the agent's behavior",
      });
    }

    // Check maxIterations
    const maxIterations = config.maxIterations as number | undefined;
    if (maxIterations !== undefined) {
      if (isNaN(maxIterations) || maxIterations < 1) {
        errors.push({
          type: 'invalid_value',
          property: 'maxIterations',
          message: 'maxIterations must be a positive number',
          fix: 'Set maxIterations to a value >= 1 (e.g., 10)',
        });
      } else if (maxIterations > 50) {
        warnings.push({
          type: 'inefficient',
          property: 'maxIterations',
          message: `maxIterations is set to ${maxIterations}. High values can lead to long execution times and high costs.`,
          suggestion: 'Consider reducing maxIterations to 10-20 for most use cases',
        });
      }
    }

    // Error handling for AI operations
    if (!config.onError && !config.retryOnFail && !config.continueOnFail) {
      warnings.push({
        type: 'best_practice',
        property: 'errorHandling',
        message: 'AI models can fail due to API limits, rate limits, or invalid responses',
        suggestion: 'Add onError: "continueRegularOutput" with retryOnFail for resilience',
      });
      autofix.onError = 'continueRegularOutput';
      autofix.retryOnFail = true;
      autofix.maxTries = 2;
      autofix.waitBetweenTries = 5000;
    }
  }
}
