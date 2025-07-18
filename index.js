#!/usr/bin/env node

const fs = require('fs').promises
const fss = require('fs')
const path = require('path')

// ======================
// Configuração de Argumentos
// ======================
const ARG_CONFIG = {
  options: [
    {
      name: 'help',
      description: 'Mostra esta mensagem de ajuda',
      short: '-h',
      long: '--help',
      type: 'boolean'
    },
    {
      name: 'all',
      description: 'Cria arquivos vazios além das pastas na recriação',
      short: '-a',
      long: '--all',
      type: 'boolean'
    },
    {
      name: 'output',
      description: 'Define onde salvar ou recriar a estrutura',
      short: '-o',
      long: '--output',
      type: 'string'
    },
    {
      name: 'ignore',
      description: 'Ignora arquivos/pastas usando um arquivo de ignore',
      short: '-i',
      long: '--ignore',
      type: 'string'
    },
    {
      name: 'debug',
      description: 'Mostra logs detalhados da criação de arquivos e pastas',
      short: '-d',
      long: '--debug',
      type: 'boolean'
    },
    {
      name: 'show',
      description: 'Exibe a árvore antes de recriar a estrutura',
      short: '-s',
      long: '--show',
      type: 'boolean'
    }
  ],
  examples: [
    {
      command: 'tgen ./meuProjeto',
      description: 'Mostra a árvore de arquivos/pastas do diretório especificado'
    },
    {
      command: 'tgen ./meuProjeto -o ./path/tree.txt',
      description: 'Gera a árvore do diretório e salva no arquivo especificado'
    },
    {
      command: 'tgen ./path/tree.txt -a -i .ignore',
      description: 'Recria estrutura de pastas/arquivos exceto as listadas no arquivo .ignore'
    },
    {
      command: 'tgen ./path/tree.txt -a',
      description: 'Recria a estrutura de pastas/arquivos a partir de um arquivo tree.txt (com -a cria arquivos vazios)'
    },
    {
      command: 'tgen ./path/tree.txt -o ./novaEstrutura/',
      description: 'Recria a estrutura em um diretório de destino diferente'
    },
    {
      command: 'cat ./path/tree.txt | tgen -o ./novaEstrutura/ -a',
      description: 'Recria estrutura lendo a árvore da entrada padrão (stdin)'
    }
  ]
}

// ======================
// Utilitários
// ======================
const ErrorHandler = {
  handleCriticalError(err, message = 'Erro crítico') {
    console.error(`${message}: ${err.message}`)
    process.exit(1)
  },
  handleWarning(err, message = 'Aviso') {
    console.warn(`${message}: ${err.message}`)
  }
}

const Validators = {
  validatePath(inputPath) {
    if (!inputPath) throw new Error('Caminho não fornecido')
    
    try {
      const resolved = path.resolve(inputPath)
      const exists = fss.existsSync(resolved)
      const stats = exists && fss.statSync(resolved)
      
      return {
        exists,
        isFile: exists && stats.isFile(),
        isDir: exists && stats.isDirectory(),
        resolvedPath: resolved
      }
    } catch (err) {
      throw new Error(`Caminho inválido: ${inputPath} (${err.message})`)
    }
  }
}

// ======================
// Helpers
// ======================
const Helpers = {
  resolveOutputPath(outputPath) {
    const fullPath = path.resolve(outputPath)
    const isFile = path.extname(fullPath) !== ''
    return isFile ? fullPath : path.join(fullPath, 'tree.txt')
  },

  async readStdin() {
    return new Promise((resolve, reject) => {
      let data = ''
      process.stdin.setEncoding('utf-8')
      process.stdin.on('data', chunk => data += chunk)
      process.stdin.on('end', () => resolve(data))
      process.stdin.on('error', reject)
    })
  },

  async loadIgnorePatterns(ignorePath) {
    if (!ignorePath) return ['node_modules']
    try {
      const content = await fs.readFile(ignorePath, 'utf-8')
      return content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    } catch (err) {
      ErrorHandler.handleWarning(err, `Arquivo de ignore não encontrado: ${ignorePath}. Usando padrão.`)
      return ['node_modules']
    }
  }
}

// ======================
// Operações
// ======================
const Operations = {
  async generateTree(dir, prefix = '', ignorePatterns = ['node_modules'], depth = 0, maxDepth = 20) {
    if (depth > maxDepth) {
      console.warn(`Profundidade máxima (${maxDepth}) atingida em: ${dir}`)
      return ''
    }

    try {
      let output = ''
      const entries = (await fs.readdir(dir, { withFileTypes: true }))
        .filter(entry => !ignorePatterns.includes(entry.name))
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1
          if (!a.isDirectory() && b.isDirectory()) return 1
          return a.name.localeCompare(b.name)
        })

      const last = entries.length - 1

      for (const [index, entry] of entries.entries()) {
        const isLast = index === last
        const connector = isLast ? '└── ' : '├── '
        output += prefix + connector + entry.name + (entry.isDirectory() ? '/' : '') + '\n'

        if (entry.isDirectory()) {
          const nextPrefix = prefix + (isLast ? '    ' : '│   ')
          output += await this.generateTree(
            path.join(dir, entry.name), 
            nextPrefix, 
            ignorePatterns, 
            depth + 1, 
            maxDepth
          )
        }
      }

      return output
    } catch (err) {
      ErrorHandler.handleWarning(err, `Erro ao ler diretório ${dir}`)
      return ''
    }
  },

  async buildStructureFromTree(treeStr, targetDir, createFiles = false, debug = false) {
    try {
      if (!targetDir) throw new Error('Diretório de destino não especificado')
      
      const lines = treeStr.trim().split('\n')
      if (lines.length === 0) return

      if (debug) console.log(`[DEBUG] Criando diretório base: ${targetDir}`)
      await fs.mkdir(targetDir, { recursive: true })
      const pathStack = [path.resolve(targetDir)]

      for (const line of lines.slice(1)) {
        try {
          const depth = (line.match(/│   |    /g) || []).length
          const rawName = line.replace(/^.*?── /, '')
          const name = rawName.split('#')[0].trim()
          if (!name) continue

          const isDir = name.endsWith('/')
          if (!isDir && !createFiles) continue

          const cleanName = name.replace(/\/$/, '')

          while (pathStack.length > depth + 1) {
            pathStack.pop()
          }

          const currentPath = path.join(pathStack[pathStack.length - 1], cleanName)

          if (isDir) {
            if (debug) console.log(`[DEBUG] Criando diretório: ${currentPath}`)
            await fs.mkdir(currentPath, { recursive: true })
            pathStack.push(currentPath)
          } else {
            const parentDir = path.dirname(currentPath)
            if (debug) console.log(`[DEBUG] Criando arquivo: ${currentPath}`)
            await fs.mkdir(parentDir, { recursive: true })
            await fs.writeFile(currentPath, '')
          }
        } catch (lineErr) {
          ErrorHandler.handleWarning(lineErr, `Erro ao processar linha: ${line}`)
        }
      }

      console.log(`Estrutura criada em: ${targetDir}`)
    } catch (err) {
      ErrorHandler.handleCriticalError(err, 'Falha ao construir estrutura')
    }
  }
}

// ======================
// Argument Parser
// ======================
class ArgumentParser {
  constructor(config) {
    this.config = config
    this.args = process.argv.slice(2)
    this.parsed = {}
    this.positional = []
    this.invalidArgs = []
  }

   parse() {
    // Processa argumentos posicionais
    this.positional = this.args.filter(arg => !arg.startsWith('-'))

    // Verifica argumentos inválidos
    const validFlags = this.config.options.flatMap(opt => [opt.short, opt.long])
    this.invalidArgs = this.args.filter(arg => 
      arg.startsWith('-') && !validFlags.includes(arg) && !this.positional.includes(arg)
    )

    // Processa opções válidas
    for (const option of this.config.options) {
      const flagIndex = this.args.findIndex(arg => 
        arg === option.short || arg === option.long
      )

      if (flagIndex !== -1) {
        if (option.type === 'boolean') {
          this.parsed[option.name] = true
        } else if (option.type === 'string') {
          // Verifica se tem valor após a flag
          if (flagIndex + 1 >= this.args.length || this.args[flagIndex + 1].startsWith('-')) {
            this.invalidArgs.push(`${this.args[flagIndex]} (faltando valor)`)
          } else {
            this.parsed[option.name] = this.args[flagIndex + 1]
          }
        }
      }
    }

    return {
      ...this.parsed,
      _: this.positional,
      _invalid: this.invalidArgs
    }
  }

  showHelp() {
    const calledAs = 'tgen'
    let helpText = `\nUso:\n`

    // Adiciona exemplos com descrições
    this.config.examples.forEach(example => {
      helpText += `  ${example.command}\n      ${example.description}\n\n`
    })

    helpText += `\nOpções:\n`

    // Adiciona opções
    this.config.options.forEach(option => {
      const flags = [option.short, option.long].filter(Boolean).join(', ')
      helpText += `  ${flags.padEnd(15)} ${option.description}\n`
    })

    console.log(helpText)
  }

  showInvalidArgs(invalidArgs) {
    console.error('Erro: Argumentos inválidos detectados:')
    invalidArgs.forEach(arg => {
      console.error(`  - ${arg}`)
    })
    console.error('\nUse --help para ver as opções disponíveis.\n')
  }
}

// ======================
// Execução Principal
// ======================
(async () => {
  try {
    const parser = new ArgumentParser(ARG_CONFIG)
    const args = parser.parse()

    // Mostrar erro se houver argumentos inválidos
    if (args._invalid.length > 0) {
      parser.showInvalidArgs(args._invalid)
      process.exit(1)
    }

    // Mostrar ajuda se solicitado ou sem argumentos
    if (args.help || (args._.length === 0 && process.stdin.isTTY)) {
      parser.showHelp()
      process.exit(0)
    }

    const ignorePatterns = await Helpers.loadIgnorePatterns(args.ignore)
    const inputPath = args._[0]
    const isStdin = !process.stdin.isTTY

    // Modo de reconstrução
    if ((inputPath && fss.existsSync(inputPath) && fss.statSync(inputPath).isFile()) || isStdin) {
      let targetDir
      if (isStdin) {
        if (!args.output) throw new Error('Para stdin, -o <diretório> é obrigatório')
        const targetDir = path.resolve(args.output)
        
        await fs.mkdir(targetDir, { recursive: true })
        
        const pathStack = [targetDir]
        let lastDepth = 0
        let foundFirstValidLine = false

        const rl = require('readline').createInterface({
          input: process.stdin,
          crlfDelay: Infinity
        })

        for await (const line of rl) {
          try {
            if (args.show) console.log(line)

            const trimmedLine = line.trim()
            
            // Pula linhas vazias
            if (!trimmedLine) continue
            
            // Verifica se é uma linha de hierarquia válida
            const isHierarchyLine = line.includes('├──') || line.includes('└──') || line.includes('│')
            
            // Verifica padrões comuns de primeira linha (./, ../, qualquercoisa/)
            const isRootPathLine = !isHierarchyLine && 
                                 (trimmedLine.startsWith('./') || 
                                  trimmedLine.startsWith('../') || 
                                  trimmedLine.endsWith('/') || 
                                  trimmedLine === '.' || 
                                  trimmedLine === '..')
            
            // Se ainda não encontrou a primeira linha válida
            if (!foundFirstValidLine) {
              // Se for uma linha de raiz (./, ../, pasta/) ou linha vazia, ignora
              if (isRootPathLine || !isHierarchyLine) {
                continue
              }
              foundFirstValidLine = true
            }

            const depth = (line.match(/│   |    /g) || []).length
            const rawName = line.replace(/^.*?── /, '')
            const name = rawName.split('#')[0].trim()
            
            if (!name) continue

            const isDir = name.endsWith('/')
            if (!isDir && !args.all) continue

            const cleanName = name.replace(/\/$/, '')

            while (pathStack.length > depth + 1) {
              pathStack.pop()
            }

            if (depth < lastDepth) {
              pathStack.length = depth + 1
            }
            lastDepth = depth

            const currentPath = path.join(pathStack[pathStack.length - 1], cleanName)

            if (isDir) {
              if (args.debug) console.log(`[DEBUG] Criando diretório: ${currentPath}`)
              await fs.mkdir(currentPath, { recursive: true })
              pathStack.push(currentPath)
            } else {
              const parentDir = path.dirname(currentPath)
              if (args.debug) console.log(`[DEBUG] Criando arquivo: ${currentPath}`)
              await fs.mkdir(parentDir, { recursive: true })
              await fs.writeFile(currentPath, '')
            }
          } catch (lineErr) {
            ErrorHandler.handleWarning(lineErr, `Erro ao processar linha: ${line}`)
          }
        }

        console.log(`Estrutura criada em: ${targetDir}`)
        return
      } else {
        targetDir = args.output ? path.resolve(args.output) : path.dirname(inputPath)
      }

      const treeStr = isStdin
        ? await Helpers.readStdin()
        : await fs.readFile(inputPath, 'utf-8')

      if (args.show) {
        console.log('\nEstrutura que será criada:')
        console.log(treeStr)
      }

      await Operations.buildStructureFromTree(treeStr, targetDir, args.all, args.debug)
      return
    }

    // Modo de geração
    if (inputPath && fss.existsSync(inputPath)) {
      const stats = fss.statSync(inputPath)
      if (stats.isDirectory()) {
        const treeStr = path.basename(inputPath) + '/\n' + 
        await Operations.generateTree(inputPath, '', ignorePatterns)
      
        if (!args.output || args.show) {
          console.log(treeStr)
        }

        if (args.output) {
          const finalPath = Helpers.resolveOutputPath(args.output)
          await fs.mkdir(path.dirname(finalPath), { recursive: true })
          await fs.writeFile(finalPath, treeStr, 'utf-8')
          console.log(`\nÁrvore salva em: ${finalPath}`)
        }
        return
      }
    }

    throw new Error('Caminho não existe ou não é um diretório/arquivo válido')
  } catch (err) {
    ErrorHandler.handleCriticalError(err)
  }
})()