/**
 * Health Command
 * Check n8n instance connectivity and API status
 */

import chalk from 'chalk';
import axios from 'axios';
import { getConfig, maskApiKey } from '../../core/config/loader.js';
import { formatHeader } from '../../core/formatters/header.js';
import { theme, icons } from '../../core/formatters/theme.js';

interface HealthOptions {
  json?: boolean;
}

interface HealthResult {
  status: 'ok' | 'error';
  host: string;
  connected: boolean;
  apiKeyValid: boolean;
  n8nVersion?: string;
  instanceId?: string;
  latencyMs?: number;
  error?: string;
}

export async function healthCommand(opts: HealthOptions): Promise<void> {
  const config = getConfig();
  const startTime = Date.now();
  
  const result: HealthResult = {
    status: 'error',
    host: config.host,
    connected: false,
    apiKeyValid: false,
  };
  
  try {
    // Check if host is configured
    if (!config.host) {
      result.error = 'N8N_HOST not configured';
      outputResult(result, opts);
      return;
    }
    
    // Check if API key is configured
    if (!config.apiKey) {
      result.error = 'N8N_API_KEY not configured';
      outputResult(result, opts);
      return;
    }
    
    // Try healthz endpoint first (no auth required)
    const healthzUrl = config.host.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '') + '/healthz';
    
    try {
      const healthzResponse = await axios.get(healthzUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });
      
      if (healthzResponse.status === 200) {
        result.connected = true;
        if (healthzResponse.data?.status === 'ok') {
          result.status = 'ok';
        }
      }
    } catch (e) {
      // healthz might not be available, try API endpoint
    }
    
    // Try API endpoint with auth
    const apiUrl = config.host.endsWith('/api/v1') 
      ? config.host 
      : `${config.host.replace(/\/$/, '')}/api/v1`;
    
    try {
      const apiResponse = await axios.get(`${apiUrl}/workflows`, {
        timeout: 5000,
        headers: {
          'X-N8N-API-KEY': config.apiKey,
        },
        params: { limit: 1 },
        validateStatus: () => true,
      });
      
      result.latencyMs = Date.now() - startTime;
      
      if (apiResponse.status === 200) {
        result.connected = true;
        result.apiKeyValid = true;
        result.status = 'ok';
      } else if (apiResponse.status === 401) {
        result.connected = true;
        result.apiKeyValid = false;
        result.error = 'Invalid API key';
      } else if (apiResponse.status === 404) {
        result.connected = true;
        result.error = 'API endpoint not found - check n8n version';
      } else {
        result.error = `API returned status ${apiResponse.status}`;
      }
    } catch (apiError: any) {
      if (apiError.code === 'ECONNREFUSED') {
        result.error = 'Connection refused - is n8n running?';
      } else if (apiError.code === 'ENOTFOUND') {
        result.error = 'Host not found - check N8N_HOST';
      } else {
        result.error = apiError.message || 'Unknown error';
      }
    }
    
  } catch (error: any) {
    result.error = error.message || 'Unknown error';
  }
  
  outputResult(result, opts);
}

function outputResult(result: HealthResult, opts: HealthOptions): void {
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  const config = getConfig();
  
  // Header
  console.log(formatHeader({
    title: 'n8n Health Check',
    icon: icons.health,
    context: {
      'Host': result.host || 'Not configured',
      'API Key': config.apiKey ? maskApiKey(config.apiKey) : 'Not configured',
    },
  }));
  
  console.log('');
  
  // Status
  if (result.status === 'ok') {
    console.log(theme.success(`${icons.success} Connection: OK`));
    console.log(theme.success(`${icons.success} API Key: Valid`));
    if (result.latencyMs) {
      console.log(theme.info(`${icons.info} Latency: ${result.latencyMs}ms`));
    }
    if (result.n8nVersion) {
      console.log(theme.info(`${icons.info} n8n Version: ${result.n8nVersion}`));
    }
  } else {
    if (result.connected) {
      console.log(theme.success(`${icons.success} Connection: OK`));
    } else {
      console.log(theme.error(`${icons.error} Connection: Failed`));
    }
    
    if (result.apiKeyValid) {
      console.log(theme.success(`${icons.success} API Key: Valid`));
    } else if (result.connected) {
      console.log(theme.error(`${icons.error} API Key: Invalid`));
    }
    
    if (result.error) {
      console.log(theme.error(`\n${icons.error} Error: ${result.error}`));
    }
  }
  
  console.log('');
  
  // Next steps
  if (!result.connected) {
    console.log(chalk.yellow('💡 Tips:'));
    console.log(chalk.dim('   • Check that n8n is running'));
    console.log(chalk.dim('   • Verify N8N_HOST environment variable'));
    console.log(chalk.dim('   • Example: export N8N_HOST=http://localhost:5678'));
  } else if (!result.apiKeyValid) {
    console.log(chalk.yellow('💡 Tips:'));
    console.log(chalk.dim('   • Check your N8N_API_KEY environment variable'));
    console.log(chalk.dim('   • Generate a new API key in n8n Settings → API'));
  }
  
  // Set exit code
  process.exitCode = result.status === 'ok' ? 0 : 1;
}
