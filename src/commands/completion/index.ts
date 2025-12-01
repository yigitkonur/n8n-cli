/**
 * Shell Completion Command
 * Generates shell completion scripts for bash, zsh, and fish
 */

import chalk from 'chalk';
import type { GlobalOptions } from '../../types/global-options.js';

interface CompletionOptions extends GlobalOptions {
  // No additional options
}

/**
 * All n8n commands and subcommands for completion
 */
const COMMANDS = {
  // Top-level commands
  topLevel: ['auth', 'health', 'nodes', 'workflows', 'executions', 'credentials', 'variables', 'tags', 'audit', 'templates', 'validate', 'completion', 'config'],
  
  // Subcommands by parent
  auth: ['login', 'status', 'logout'],
  nodes: ['list', 'show', 'categories', 'search', 'get', 'validate'],
  workflows: ['list', 'get', 'validate', 'create', 'update', 'autofix', 'trigger', 'tags', 'export', 'import', 'activate', 'deactivate', 'delete'],
  executions: ['list', 'get', 'retry', 'delete'],
  credentials: ['list', 'schema', 'create', 'delete', 'types', 'show-type'],
  variables: ['list', 'create', 'update', 'delete'],
  tags: ['list', 'get', 'create', 'update', 'delete'],
  templates: ['search', 'get'],
  config: ['show'],
};

/**
 * Generate Bash completion script
 */
function generateBashCompletion(): string {
  return `# n8n CLI bash completion
# Install: n8n completion bash > /etc/bash_completion.d/n8n
#    or: n8n completion bash >> ~/.bashrc

_n8n_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="${COMMANDS.topLevel.join(' ')}"
    local auth_cmds="${COMMANDS.auth.join(' ')}"
    local nodes_cmds="${COMMANDS.nodes.join(' ')}"
    local workflows_cmds="${COMMANDS.workflows.join(' ')}"
    local executions_cmds="${COMMANDS.executions.join(' ')}"
    local credentials_cmds="${COMMANDS.credentials.join(' ')}"
    local variables_cmds="${COMMANDS.variables.join(' ')}"
    local tags_cmds="${COMMANDS.tags.join(' ')}"
    local templates_cmds="${COMMANDS.templates.join(' ')}"
    local config_cmds="${COMMANDS.config.join(' ')}"

    case "\${cword}" in
        1)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            ;;
        2)
            case "\${prev}" in
                auth)
                    COMPREPLY=( $(compgen -W "\${auth_cmds}" -- "\${cur}") )
                    ;;
                nodes)
                    COMPREPLY=( $(compgen -W "\${nodes_cmds}" -- "\${cur}") )
                    ;;
                workflows)
                    COMPREPLY=( $(compgen -W "\${workflows_cmds}" -- "\${cur}") )
                    ;;
                executions)
                    COMPREPLY=( $(compgen -W "\${executions_cmds}" -- "\${cur}") )
                    ;;
                credentials)
                    COMPREPLY=( $(compgen -W "\${credentials_cmds}" -- "\${cur}") )
                    ;;
                variables)
                    COMPREPLY=( $(compgen -W "\${variables_cmds}" -- "\${cur}") )
                    ;;
                tags)
                    COMPREPLY=( $(compgen -W "\${tags_cmds}" -- "\${cur}") )
                    ;;
                templates)
                    COMPREPLY=( $(compgen -W "\${templates_cmds}" -- "\${cur}") )
                    ;;
                config)
                    COMPREPLY=( $(compgen -W "\${config_cmds}" -- "\${cur}") )
                    ;;
                completion)
                    COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
                    ;;
            esac
            ;;
        *)
            # Complete file paths for certain arguments
            case "\${words[1]}" in
                workflows)
                    case "\${words[2]}" in
                        create|validate|import)
                            _filedir json
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
}

complete -F _n8n_completions n8n
`;
}

/**
 * Generate Zsh completion script
 */
function generateZshCompletion(): string {
  return `#compdef n8n
# n8n CLI zsh completion
# Install: n8n completion zsh > ~/.zsh/completions/_n8n
#    and add: fpath=(~/.zsh/completions $fpath) to ~/.zshrc

_n8n() {
    local -a commands
    commands=(
        'auth:Manage n8n CLI authentication'
        'health:Check n8n instance connectivity'
        'nodes:Search, list, and inspect n8n nodes'
        'workflows:Manage n8n workflows'
        'executions:View and manage workflow executions'
        'credentials:Manage n8n credentials'
        'variables:Manage n8n environment variables'
        'tags:Manage n8n tags'
        'audit:Generate security audit'
        'templates:Search and get workflow templates'
        'validate:Validate workflow JSON file'
        'completion:Generate shell completion scripts'
        'config:View configuration'
    )

    local -a auth_commands=(
        'login:Configure n8n credentials'
        'status:Show current authentication status'
        'logout:Clear stored credentials'
    )

    local -a nodes_commands=(
        'list:List all available nodes'
        'show:Show node details and schema'
        'categories:List all node categories'
        'search:Search for nodes by keyword'
        'get:Get node schema (alias for show)'
        'validate:Validate node configuration'
    )

    local -a workflows_commands=(
        'list:List all workflows'
        'get:Get workflow by ID'
        'validate:Validate a workflow'
        'create:Create a new workflow'
        'update:Update workflow with partial changes'
        'autofix:Auto-fix workflow validation issues'
        'trigger:Trigger workflow via webhook'
        'tags:Get or set workflow tags'
        'export:Export workflow to file'
        'import:Import workflow from file'
        'activate:Activate workflows'
        'deactivate:Deactivate workflows'
        'delete:Delete workflows'
    )

    local -a executions_commands=(
        'list:List executions'
        'get:Get execution details'
        'retry:Retry a failed execution'
        'delete:Delete an execution'
    )

    local -a credentials_commands=(
        'list:List all credentials'
        'schema:Get credential type schema'
        'create:Create a new credential'
        'delete:Delete a credential'
        'types:List all credential types'
        'show-type:Show credential type schema'
    )

    local -a variables_commands=(
        'list:List all variables'
        'create:Create a new variable'
        'update:Update a variable'
        'delete:Delete a variable'
    )

    local -a tags_commands=(
        'list:List all tags'
        'get:Get tag by ID'
        'create:Create a new tag'
        'update:Update a tag'
        'delete:Delete a tag'
    )

    local -a templates_commands=(
        'search:Search templates by keyword'
        'get:Get template by ID'
    )

    local -a config_commands=(
        'show:Display current configuration'
    )

    local -a completion_shells=(
        'bash:Generate bash completion script'
        'zsh:Generate zsh completion script'
        'fish:Generate fish completion script'
    )

    _arguments -C \\
        '-v[Enable verbose output]' \\
        '-q[Suppress non-essential output]' \\
        '--no-color[Disable colored output]' \\
        '--profile[Use specific configuration profile]:profile:' \\
        '--version[Output version number]' \\
        '-h[Display help]' \\
        '1: :->command' \\
        '2: :->subcommand' \\
        '*::arg:->args'

    case "$state" in
        command)
            _describe 'command' commands
            ;;
        subcommand)
            case "$words[1]" in
                auth) _describe 'subcommand' auth_commands ;;
                nodes) _describe 'subcommand' nodes_commands ;;
                workflows) _describe 'subcommand' workflows_commands ;;
                executions) _describe 'subcommand' executions_commands ;;
                credentials) _describe 'subcommand' credentials_commands ;;
                variables) _describe 'subcommand' variables_commands ;;
                tags) _describe 'subcommand' tags_commands ;;
                templates) _describe 'subcommand' templates_commands ;;
                config) _describe 'subcommand' config_commands ;;
                completion) _describe 'shell' completion_shells ;;
            esac
            ;;
    esac
}

_n8n
`;
}

/**
 * Generate Fish completion script
 */
function generateFishCompletion(): string {
  return `# n8n CLI fish completion
# Install: n8n completion fish > ~/.config/fish/completions/n8n.fish

# Disable file completion by default
complete -c n8n -f

# Global options
complete -c n8n -s v -l verbose -d 'Enable verbose output'
complete -c n8n -s q -l quiet -d 'Suppress non-essential output'
complete -c n8n -l no-color -d 'Disable colored output'
complete -c n8n -l profile -d 'Use specific configuration profile' -r
complete -c n8n -s V -l version -d 'Output version number'
complete -c n8n -s h -l help -d 'Display help'

# Top-level commands
complete -c n8n -n __fish_use_subcommand -a auth -d 'Manage n8n CLI authentication'
complete -c n8n -n __fish_use_subcommand -a health -d 'Check n8n instance connectivity'
complete -c n8n -n __fish_use_subcommand -a nodes -d 'Search, list, and inspect n8n nodes'
complete -c n8n -n __fish_use_subcommand -a workflows -d 'Manage n8n workflows'
complete -c n8n -n __fish_use_subcommand -a executions -d 'View and manage workflow executions'
complete -c n8n -n __fish_use_subcommand -a credentials -d 'Manage n8n credentials'
complete -c n8n -n __fish_use_subcommand -a variables -d 'Manage n8n environment variables'
complete -c n8n -n __fish_use_subcommand -a tags -d 'Manage n8n tags'
complete -c n8n -n __fish_use_subcommand -a audit -d 'Generate security audit'
complete -c n8n -n __fish_use_subcommand -a templates -d 'Search and get workflow templates'
complete -c n8n -n __fish_use_subcommand -a validate -d 'Validate workflow JSON file'
complete -c n8n -n __fish_use_subcommand -a completion -d 'Generate shell completion scripts'
complete -c n8n -n __fish_use_subcommand -a config -d 'View configuration'

# auth subcommands
complete -c n8n -n '__fish_seen_subcommand_from auth' -a login -d 'Configure n8n credentials'
complete -c n8n -n '__fish_seen_subcommand_from auth' -a status -d 'Show current authentication status'
complete -c n8n -n '__fish_seen_subcommand_from auth' -a logout -d 'Clear stored credentials'

# nodes subcommands
complete -c n8n -n '__fish_seen_subcommand_from nodes' -a list -d 'List all available nodes'
complete -c n8n -n '__fish_seen_subcommand_from nodes' -a show -d 'Show node details and schema'
complete -c n8n -n '__fish_seen_subcommand_from nodes' -a categories -d 'List all node categories'
complete -c n8n -n '__fish_seen_subcommand_from nodes' -a search -d 'Search for nodes by keyword'
complete -c n8n -n '__fish_seen_subcommand_from nodes' -a get -d 'Get node schema'
complete -c n8n -n '__fish_seen_subcommand_from nodes' -a validate -d 'Validate node configuration'

# workflows subcommands
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a list -d 'List all workflows'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a get -d 'Get workflow by ID'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a validate -d 'Validate a workflow'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a create -d 'Create a new workflow'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a update -d 'Update workflow'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a autofix -d 'Auto-fix workflow issues'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a trigger -d 'Trigger workflow via webhook'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a tags -d 'Get or set workflow tags'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a export -d 'Export workflow to file'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a import -d 'Import workflow from file'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a activate -d 'Activate workflows'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a deactivate -d 'Deactivate workflows'
complete -c n8n -n '__fish_seen_subcommand_from workflows' -a delete -d 'Delete workflows'

# executions subcommands
complete -c n8n -n '__fish_seen_subcommand_from executions' -a list -d 'List executions'
complete -c n8n -n '__fish_seen_subcommand_from executions' -a get -d 'Get execution details'
complete -c n8n -n '__fish_seen_subcommand_from executions' -a retry -d 'Retry a failed execution'
complete -c n8n -n '__fish_seen_subcommand_from executions' -a delete -d 'Delete an execution'

# credentials subcommands
complete -c n8n -n '__fish_seen_subcommand_from credentials' -a list -d 'List all credentials'
complete -c n8n -n '__fish_seen_subcommand_from credentials' -a schema -d 'Get credential type schema'
complete -c n8n -n '__fish_seen_subcommand_from credentials' -a create -d 'Create a new credential'
complete -c n8n -n '__fish_seen_subcommand_from credentials' -a delete -d 'Delete a credential'
complete -c n8n -n '__fish_seen_subcommand_from credentials' -a types -d 'List credential types'
complete -c n8n -n '__fish_seen_subcommand_from credentials' -a show-type -d 'Show credential type schema'

# variables subcommands
complete -c n8n -n '__fish_seen_subcommand_from variables' -a list -d 'List all variables'
complete -c n8n -n '__fish_seen_subcommand_from variables' -a create -d 'Create a new variable'
complete -c n8n -n '__fish_seen_subcommand_from variables' -a update -d 'Update a variable'
complete -c n8n -n '__fish_seen_subcommand_from variables' -a delete -d 'Delete a variable'

# tags subcommands
complete -c n8n -n '__fish_seen_subcommand_from tags' -a list -d 'List all tags'
complete -c n8n -n '__fish_seen_subcommand_from tags' -a get -d 'Get tag by ID'
complete -c n8n -n '__fish_seen_subcommand_from tags' -a create -d 'Create a new tag'
complete -c n8n -n '__fish_seen_subcommand_from tags' -a update -d 'Update a tag'
complete -c n8n -n '__fish_seen_subcommand_from tags' -a delete -d 'Delete a tag'

# templates subcommands
complete -c n8n -n '__fish_seen_subcommand_from templates' -a search -d 'Search templates by keyword'
complete -c n8n -n '__fish_seen_subcommand_from templates' -a get -d 'Get template by ID'

# config subcommands
complete -c n8n -n '__fish_seen_subcommand_from config' -a show -d 'Display current configuration'

# completion subcommands
complete -c n8n -n '__fish_seen_subcommand_from completion' -a bash -d 'Generate bash completion script'
complete -c n8n -n '__fish_seen_subcommand_from completion' -a zsh -d 'Generate zsh completion script'
complete -c n8n -n '__fish_seen_subcommand_from completion' -a fish -d 'Generate fish completion script'
`;
}

/**
 * Completion command handler
 */
export async function completionCommand(shell: string, _opts: CompletionOptions): Promise<void> {
  const validShells = ['bash', 'zsh', 'fish'];
  
  if (!validShells.includes(shell)) {
    console.error(chalk.red(`Unknown shell: ${shell}`));
    console.error(chalk.dim(`Supported shells: ${validShells.join(', ')}`));
    process.exitCode = 1;
    return;
  }
  
  let script: string;
  let installInstructions: string;
  
  switch (shell) {
    case 'bash':
      script = generateBashCompletion();
      installInstructions = `
# Installation:
# Add to your ~/.bashrc:
#   source <(n8n completion bash)
#
# Or save to completion directory:
#   n8n completion bash > /etc/bash_completion.d/n8n
#   # or for user-only:
#   n8n completion bash > ~/.local/share/bash-completion/completions/n8n
`;
      break;
      
    case 'zsh':
      script = generateZshCompletion();
      installInstructions = `
# Installation:
# Add to your ~/.zshrc:
#   source <(n8n completion zsh)
#
# Or save to completions directory:
#   mkdir -p ~/.zsh/completions
#   n8n completion zsh > ~/.zsh/completions/_n8n
#   # Add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)
`;
      break;
      
    case 'fish':
      script = generateFishCompletion();
      installInstructions = `
# Installation:
# Save to fish completions directory:
#   n8n completion fish > ~/.config/fish/completions/n8n.fish
`;
      break;
      
    default:
      return;
  }
  
  // Output the script (can be piped to file or sourced)
  console.log(script);
  
  // Show install instructions to stderr (doesn't affect piping)
  console.error(chalk.dim(installInstructions));
}
