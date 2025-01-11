import '@logseq/libs' //https://plugins-doc.logseq.com/
import { settingsTemplate } from './settings'
import { t } from 'logseq-l10n'
import { LSPluginBaseInfo } from '@logseq/libs/dist/LSPlugin.user'

const keyToolbar = "cssSnippet"
const keyCss = "cssSnippet"

// L10n
// import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
// import ja from "./translations/ja.json"

const createSnippetItem = () => {
  const snippetItem = document.createElement('details')
  snippetItem.className = 'snippet-item'
  snippetItem.draggable = true

  const summary = document.createElement('summary')
  summary.style.display = 'flex'
  summary.style.alignItems = 'center'

  const toggleButton = document.createElement('span')
  toggleButton.className = 'toggle-button'
  toggleButton.style.cursor = 'pointer'
  toggleButton.textContent = '▶'

  const titleInput = document.createElement('input')
  titleInput.type = 'text'
  titleInput.className = 'snippet-title form-input'
  titleInput.placeholder = t("Snippet title")
  titleInput.style.flexGrow = '1'

  const enableCheckbox = document.createElement('input')
  enableCheckbox.type = 'checkbox'
  enableCheckbox.className = 'snippet-enable form-checkbox'
  enableCheckbox.title = t('Enable') + ' / ' + t('Disable')

  // 削除ボタン追加
  const deleteButton = document.createElement('button')
  deleteButton.textContent = '🗑️'
  deleteButton.title = t('Delete this snippet')
  deleteButton.style.marginLeft = '5px'

  // クリアボタン追加
  const clearButton = document.createElement('button')
  clearButton.textContent = '🧹'
  clearButton.title = t('Clear content')
  clearButton.style.marginLeft = '5px'

  // コピーボタン追加
  const copyButton = document.createElement('button')
  copyButton.textContent = '📋'
  copyButton.title = t('Copy CSS')
  copyButton.style.marginLeft = '5px'
  copyButton.style.marginRight = '8px'

  // 複製ボタン追加
  const duplicateButton = document.createElement('button')
  duplicateButton.textContent = '📑'
  duplicateButton.title = t('Duplicate snippet')
  duplicateButton.style.marginLeft = '5px'

  summary.appendChild(toggleButton)
  summary.appendChild(enableCheckbox)
  summary.appendChild(titleInput)
  summary.appendChild(copyButton)
  summary.appendChild(duplicateButton)
  summary.appendChild(clearButton)
  summary.appendChild(deleteButton)
  snippetItem.appendChild(summary)

  const textarea = document.createElement('textarea')
  textarea.className = 'css-editor form-input language-css'
  snippetItem.appendChild(textarea)

  snippetItem.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', '')
    snippetItem.classList.add('dragging')
  })

  snippetItem.addEventListener('dragend', () => {
    snippetItem.classList.remove('dragging')
  })

  snippetItem.addEventListener('toggle', () => {
    toggleButton.textContent = snippetItem.open ? '▼' : '▶'
  })

  titleInput.addEventListener('focus', () => {
    snippetItem.open = true
  })

  titleInput.addEventListener('blur', autoSave)
  textarea.addEventListener('blur', autoSave)

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation()
    }
  })

  enableCheckbox.addEventListener('change', () => {
    autoSave()
    css()
  })

  // 削除ボタンのイベントハンドラ
  deleteButton.addEventListener('click', () => {
    snippetItem.remove()
    saveSnippets()
    css()
  })

  // クリアボタンのイベントハンドラ
  clearButton.addEventListener('click', () => {
    textarea.value = ''  // タイトルのクリアを削除し、textareaのみクリア
    saveSnippets()
    css()
  })

  // コピーボタンのイベントハンドラ
  copyButton.addEventListener('click', () => {
    window.focus()
    navigator.clipboard.writeText(textarea.value).then(() => {
      logseq.UI.showMsg(t('CSS copied to clipboard'))
    })
  })

  // 複製ボタンのイベントハンドラ
  duplicateButton.addEventListener('click', () => {
    const newSnippet = createSnippetItem()
    const title = titleInput.value;
    (newSnippet.querySelector('.snippet-title') as HTMLInputElement).value = title ? title + ' (copy)' : '';
    (newSnippet.querySelector('.css-editor') as HTMLTextAreaElement).value = textarea.value || '';
    (newSnippet.querySelector('.snippet-enable') as HTMLInputElement).checked = enableCheckbox.checked || false
    snippetItem.parentNode?.insertBefore(newSnippet, snippetItem.nextSibling)
    saveSnippets()
    css()
  })

  return snippetItem
}

const enableDragAndDrop = (container: HTMLElement) => {
  container.addEventListener('dragover', (e) => {
    e.preventDefault()
    const draggingItem = container.querySelector('.dragging') as HTMLElement
    const afterElement = getDragAfterElement(container, e.clientY)
    if (afterElement == null)
      container.appendChild(draggingItem)
    else
      container.insertBefore(draggingItem, afterElement)
  })
}

const getDragAfterElement = (container: HTMLElement, y: number) => {
  const draggableElements = [...container.querySelectorAll('.snippet-item:not(.dragging)')] as HTMLElement[]
  if (draggableElements.length === 0) return null
  return ((draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect()
    const offset = y - box.top - box.height / 2
    return (offset < 0 && offset > closest.offset) ?
      { offset: offset, element: child }
      : closest
  }, { offset: Number.NEGATIVE_INFINITY })) as any).element
}

const saveSnippets = () => {
  const snippetData = Array.from(parent.document.getElementsByClassName('snippet-item') as HTMLCollectionOf<Element>).map((snippet: Element) => {
    const title = (snippet.querySelector('.snippet-title') as HTMLInputElement).value || ''
    const css = (snippet.querySelector('.css-editor') as HTMLTextAreaElement).value || ''
    const enabled = (snippet.querySelector('.snippet-enable') as HTMLInputElement).checked || false
    return { title, css, enabled }
  })
  const lastSaved = new Date().toISOString() // 保存時刻を記録
  if (snippetData.length > 0)
    logseq.updateSettings({ snippets: snippetData, lastSaved })
  updateLastSavedTime(lastSaved) // 時刻表示を更新
}

// 最終保存時刻の表示を更新する関数
const updateLastSavedTime = (isoTime: string) => {
  const lastSavedEl = parent.document.getElementById('last-saved-time')
  if (lastSavedEl) {
    const date = new Date(isoTime)
    lastSavedEl.textContent = date.toLocaleString()
  }
}

const loadSnippets = () => {
  const container = parent.document.getElementById('snippet-container')
  if (container && logseq.settings!.snippets) {
    const snippetsFromSettings = logseq.settings!.snippets as Array<{ title: string, css: string, enabled: boolean }>
    snippetsFromSettings.forEach((snippet: { title: string, css: string, enabled: boolean }) => {
      const snippetItem = createSnippetItem();
      (snippetItem.querySelector('.snippet-title') as HTMLInputElement).value = snippet.title || '';
      (snippetItem.querySelector('.css-editor') as HTMLTextAreaElement).value = snippet.css || '';
      (snippetItem.querySelector('.snippet-enable') as HTMLInputElement).checked = snippet.enabled || false
      container.appendChild(snippetItem)
    })
  }
}

const observeContainerRemoval = () => {
  const container = parent.document.getElementById('snippet-container')
  if (container) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && !parent.document.getElementById('snippet-container')) {
          saveSnippets()
          observer.disconnect()
        }
      })
    })
    observer.observe(container.parentNode!, { childList: true })
  }
}

const removeSnippetItem = (container: HTMLElement) => {
  const snippets = container.getElementsByClassName('snippet-item')
  if (snippets.length > 0) {
    const lastSnippet = snippets[snippets.length - 1] as HTMLElement
    if ((lastSnippet.querySelector('.snippet-title') as HTMLInputElement).value
      || (lastSnippet.querySelector('.css-editor') as HTMLTextAreaElement).value) {
      logseq.UI.showMsg(t("Cannot remove a snippet with content. Please clear the title and content before removing."))
    } else {
      container.removeChild(lastSnippet)
      saveSnippets() // 追加: スニペット削除後に設定を更新
    }
  }
}

const autoSave = () => {
  const saveButton = parent.document.getElementById('save-snippets') as HTMLButtonElement
  saveButton.disabled = true
  saveButton.textContent = t("Save")
  saveButton.style.color = 'red'
  setTimeout(() => {
    saveButton.disabled = false
    saveButton.click()
    saveButton.textContent = t("Save")
    saveButton.style.color = ''
  }, 3000)
}

const addEventListenerOnce = (element: HTMLElement, event: string, handler: EventListenerOrEventListenerObject) => {
  element.removeEventListener(event, handler)
  element.addEventListener(event, handler)
}

/* main */
const main = async () => {

  // L10n
  // await l10nSetup({ builtinTranslations: { ja } })

  /* user settings */
  logseq.useSettingsSchema(settingsTemplate())

  // if (!logseq.settings)
  //   setTimeout(() => logseq.showSettingsUI(), 300)

  logseq.App.registerUIItem('toolbar', {
    key: keyToolbar,
    template: `<div id="${keyToolbar}" data-rect><a class="button icon" data-on-click="${keyToolbar}" title="${t("Open snippet list")}" style="font-size:18px">✏️</a></div>`,
  })

  // <button id="open-settings" title="${t("Open settings")}">⚙️</button>
  logseq.provideModel({
    [keyToolbar]: async () => {
      logseq.provideUI({
        key: keyToolbar,
        reset: true,
        replace: true,
        template: `
        <div style="padding:1em">
          <span title="CSS Snippets Plugin\n\n${t("Snippets registered here will be reflected as CSS.")}" style="font-weight: bold">${t("CSS snippets")}</span>
        </div>
        <div id="snippet-navigator">
          <button id="add-snippet" title="${t("Add a snippet at the end")}\n\n${t("Snippets can be dragged up and down to swap snippets.")}">➕</button>
          <button id="remove-snippet" title="${t("Erase the last snippet")}">➖</button>
          <button id="print-snippets" title="${t("Print all snippets")}\n\n${t("All snippets are saved in the plugin settings.")}\n${t("Please save important code on your own.")}" style="margin-left:1em">🖨️</button>
          <button id="save-snippets" title="${t("When the focus is removed from the input field, it is automatically saved.")}" style="margin-left:1em">${t("Save")}</button>
          <span id="last-saved-time" title="${t("Last saved time")}" style="margin-left:1em;color:var(--ls-secondary-text-color)">${logseq.settings!.lastSaved ? new Date(logseq.settings!.lastSaved as string).toLocaleString() : ''}</span>
        </div>
        <div id="snippet-container"></div>

        <style>
        #snippet-navigator {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
            & button:hover {
              opacity: 0.6;
            }
            & #add-snippet, 
            & #remove-snippet {
              font-size: 1.4em;
            }  
        }
        #snippet-container {
            & input[type="checkbox"]:hover,
            & .toggle-button:hover,
            & button:hover {
              opacity: 0.6;
            }
            & .snippet-item {
              margin-bottom: 10px;
            }
            & .snippet-title {
              width: 100%;
              padding: 5px;
              margin-bottom: 5px;
            }
            & input[type="checkbox"] {
              width: 2em;
              height: 1.4em;
              border-radius: 1em;
            }
            & textarea {
              width: 100%;
              height: 200px;
              padding: 5px;
              resize: vertical;
            }
            & .dragging {
              opacity: 0.5;
            }
            & summary {
              cursor: pointer;
            }
            & .toggle-button {
              margin-right: 5px;
              font-size: 1.2em;
            }
        }
        </style>
        `,
        style: {
          width: "700px",
          height: "50vh",
          overflow: "auto",
          padding: "10px",
          backgroundColor: "var(--ls-tertiary-background-color)",
          position: "fixed",
          top: "3em",
          right: "3em",
        },
      })

      setTimeout(() => {
        const container = parent.document.getElementById('snippet-container')
        const addButton = parent.document.getElementById('add-snippet')
        const removeButton = parent.document.getElementById('remove-snippet')
        const saveButton = parent.document.getElementById('save-snippets')
        const printButton = parent.document.getElementById('print-snippets')
        // const openSettingsButton = parent.document.getElementById('open-settings') 

        if (container && addButton && removeButton && saveButton && printButton) { //  && openSettingsButton
          addEventListenerOnce(addButton, 'click', () => {
            container.appendChild(createSnippetItem())
            saveSnippets() // 追加: 新しいスニペット追加後に設定を更新
          })

          addEventListenerOnce(removeButton, 'click', () => {
            removeSnippetItem(container)
          })

          addEventListenerOnce(saveButton, 'click', saveSnippets)

          addEventListenerOnce(printButton, 'click', async () => {
            const allCss = allSnippets() as string
            if (allCss.length > 3) {
              logseq.provideUI({
                key: keyToolbar,
                reset: true,
                template: `
              <pre>${allCss}</pre>
              `,
                style: {
                  width: "700px",
                  height: "800px",
                  overflow: "auto",
                  padding: "10px",
                  backgroundColor: "var(--ls-tertiary-background-color)",
                  position: "fixed",
                  top: "3em",
                  right: "3em",
                  fontSize: "small",
                },
              })
            } else
              logseq.UI.showMsg(t("No snippet found."))
          })

          // Load saved snippets
          loadSnippets()

          // Enable drag and drop
          enableDragAndDrop(container)

          // Observe container removal
          observeContainerRemoval()

          // Open settings
          // addEventListenerOnce(openSettingsButton, 'click', () => {
          //   logseq.showSettingsUI()
          // })
        }
      }, 500)
    },
  })

  // スニペットをCSSとして適用する
  css()

  setTimeout(() =>
    // プラグイン設定の項目変更時
    logseq.onSettingsChanged((
      newSet: LSPluginBaseInfo["settings"],
      oldSet: LSPluginBaseInfo["settings"]
    ) => {
      if (newSet.snippets !== oldSet.snippets) {
        removeProvideStyle(keyCss)
        css()
      }
    })
    , 500)

  // プラグインが無効になったとき
  // logseq.beforeunload(async () => {
  // });

}/* end_main */

logseq.ready(main).catch(console.error) // init [required for plugin to load]


const allSnippets = (): string =>
  (logseq.settings!.snippets as Array<{ title: string, css: string, enabled: boolean }>)
    .filter(snippet => snippet.enabled)
    .map((snippet: { title: string, css: string }) =>
      // タイトルがある場合はコメントとして追加
      snippet.title ?
        `/* ${snippet.title} */\n${snippet.css}`
        : snippet.css)
    .join("\n\n")

const css = () => {
  const style = allSnippets() as string
  console.log("CSS Snippet Plugin: css()", style)
  logseq.provideStyle({
    key: keyCss,
    style
  })
}


export const removeProvideStyle = (className: string) => {
  const doc = parent.document.head.querySelector(`style[data-injected-style^="${className}"]`) as HTMLStyleElement | null
  if (doc) doc.remove()
}
