// ==UserScript==
// @name         ChatGPT-Pin-Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Enable users to easily pin important conversations to the top for quick access and better organization, enhancing productivity and user experience.
// @author       NevainK
// @match        https://chatgpt.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues

// ==/UserScript==
(function () {
  "use strict";

  const messages = {
    pin: "Pin",
    pinned: "Pinned Chats",
    unpin: "Unpin",
  };

  function getMessage(key) {
    return messages[key] || key;
  }

  const PIN_PATH_D =
    "M4.82918 4.10557C5.16796 3.428 5.86049 3 6.61803 3H17.382C18.1395 3 18.832 3.428 19.1708 4.10557L20.7889 7.34164C20.9277 7.61935 21 7.92558 21 8.23607V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V8.23607C3 7.92558 3.07229 7.61935 3.21115 7.34164L4.82918 4.10557ZM17.382 5H6.61803L5.61803 7H18.382L17.382 5ZM19 9H5V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V9ZM9 12C9 11.4477 9.44772 11 10 11H14C14.5523 11 15 11.4477 15 12C15 12.5523 14.5523 13 14 13H10C9.44772 13 9 12.5523 9 12Z";
  const UNPIN_PATH_D =
    "M4.82918 4.10557C5.16796 3.428 5.86049 3 6.61803 3H17.382C18.1395 3 18.832 3.428 19.1708 4.10557L20.7889 7.34164C20.9277 7.61935 21 7.92558 21 8.23607V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V8.23607C3 7.92558 3.07229 7.61935 3.21115 7.34164L4.82918 4.10557ZM17.382 5H6.61803L5.61803 7H18.382L17.382 5ZM19 9H5V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V9ZM9 12C9 11.4477 9.44772 11 10 11H14C14.5523 11 15 11.4477 15 12C15 12.5523 14.5523 13 14 13H10C9.44772 13 9 12.5523 9 12Z";
  const WAITING_PATH_D =
    "M4.82918 4.10557C5.16796 3.428 5.86049 3 6.61803 3H17.382C18.1395 3 18.832 3.428 19.1708 4.10557L20.7889 7.34164C20.9277 7.61935 21 7.92558 21 8.23607V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V8.23607C3 7.92558 3.07229 7.61935 3.21115 7.34164L4.82918 4.10557ZM17.382 5H6.61803L5.61803 7H18.382L17.382 5ZM19 9H5V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V9ZM9 12C9 11.4477 9.44772 11 10 11H14C14.5523 11 15 11.4477 15 12C15 12.5523 14.5523 13 14 13H10C9.44772 13 9 12.5523 9 12Z";

  const pinnedChatsSidebarID = "chatgpt-pinnedChats-1122334";
  const pinnedChatsOrderListID = "chatgpt-pinnedChats-OL-1122334";

  // 创建一个状态管理对象，用于处理绑定按钮触发的弹窗与对应会话条目的关联
  const state = {
    chatID: null,
    associatedH3Text: null,
    promiseResolve: null,
    currentPromise: null,

    setChatInfo(id, name) {
      this.chatID = id;
      this.associatedH3Text = name;
      if (this.promiseResolve) {
        this.promiseResolve({ id: this.chatID, name: this.associatedH3Text });
      }
      // oneshot: 设置完就立即重置所有状态
      this.reset();
    },

    async waitForChatInfo() {
      if (this.chatID !== null && this.associatedH3Text !== null) {
        const info = { id: this.chatID, name: this.associatedH3Text };
        this.reset(); // oneshot: 获取完就立即重置
        return info;
      }

      if (!this.currentPromise) {
        this.currentPromise = new Promise((resolve) => {
          this.promiseResolve = resolve;
        });
      }

      const result = await this.currentPromise;
      return result;
    },

    reset() {
      this.chatID = null;
      this.associatedH3Text = null;
      this.promiseResolve = null;
      this.currentPromise = null;
    },
  };

  class sidebarManager {
    constructor(db, state) {
      this.pinnedChatsDB = db;
      this.chatInfoState = state;
    }
    // 在处理点击事件时获取当前点击的聊天 ID 和对应的 H3 标题文本
    addListenEventsOnClick() {
      // 处理点击事件
      const handleClick = (event) => {
        const navElement = event.target.closest("nav");
        if (navElement) {
          const listItem = event.target.closest("li");
          const link = listItem?.querySelector("a");
          const chatId = link?.href?.split("/c/").pop();
          const associatedH3Text =
            listItem.parentElement.previousElementSibling.querySelector(
              "h3"
            ).textContent;

          this.chatInfoState.setChatInfo(chatId, associatedH3Text);
        }
      };

      // 绑定点击事件监听器
      document.addEventListener("click", handleClick, true);
    }

    // 当菜单弹窗弹出时绑定新建pin按钮事件，需要搭配 addListenEventsOnClick 获取当前点击的聊天ID和对应的H3标题文本
    addDomMutationObserver() {
      // 处理 DOM 变化
      const handleMutation = (mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (
              node instanceof HTMLElement &&
              node.hasAttribute("data-radix-popper-content-wrapper") &&
              node.getAttribute("dir") === "ltr"
            ) {
              this.insertPinUnpinButton(node);
            }
          });
        });
      };
      // 创建并绑定 MutationObserver
      const observer = new MutationObserver(handleMutation);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    insertPinUnpinButton(node) {
      const menu = node.querySelector('[role="menu"]');
      if (!menu) return;
      const newitem = menu.querySelector('[role="menuitem"]').cloneNode(true);

      newitem.querySelector("path").setAttribute("d", WAITING_PATH_D);
      this.#updateSubTextNodeContent(newitem, "Loading...");

      const s = menu.firstChild;

      this.chatInfoState
        .waitForChatInfo()
        .then(({ id: currentChatId, name: associatedH3Text }) => {
          if (this.pinnedChatsDB.has(currentChatId)) {
            newitem.querySelector("path").setAttribute("d", UNPIN_PATH_D);
            this.#updateSubTextNodeContent(newitem, getMessage("unpin"));
          } else {
            newitem.querySelector("path").setAttribute("d", PIN_PATH_D);
            this.#updateSubTextNodeContent(newitem, getMessage("pin"));
          }

          newitem.addEventListener("click", () => {
            if (newitem.textContent === getMessage("pin")) {
              this.pinnedChatsDB.insert(currentChatId, associatedH3Text);
              this.#moveChatToPinnedSection(currentChatId);
              newitem.querySelector("path").setAttribute("d", UNPIN_PATH_D);
              this.#updateSubTextNodeContent(newitem, getMessage("unpin"));
            } else {
              this.#moveChatOutOfPinnedSection(
                currentChatId,
                this.pinnedChatsDB.get(currentChatId)
              );
              this.pinnedChatsDB.remove(currentChatId);
              newitem.querySelector("path").setAttribute("d", PIN_PATH_D);
              this.#updateSubTextNodeContent(newitem, getMessage("pin"));
            }
            menu.remove();
          });
        });

      s.insertBefore(newitem, s.firstChild);
    }

    initPinnedChatsSidebar() {
      const sidebarSection = document.querySelector("nav").querySelector("h3")
        ?.parentElement?.parentElement?.parentElement;
      if (!sidebarSection) return;
      this.sidebarSectionTemplate = sidebarSection?.cloneNode(true);
      this.menuSectionParent = sidebarSection?.parentNode;

      const menu = document.querySelector("nav").querySelector("h3");
      const menuParent = menu?.parentElement?.parentElement?.parentElement;

      // 如果找不到目标父元素，则退出
      if (!menuParent) return;

      // 克隆菜单部分的模板，并设置其 ID 和标题
      const pinnedChatsSection = this.sidebarSectionTemplate.cloneNode(true);
      pinnedChatsSection.id = pinnedChatsSidebarID;
      pinnedChatsSection.querySelector("h3").textContent = getMessage("pinned");

      // 将新的固定聊天区域插入到菜单容器中
      this.menuSectionParent.insertBefore(pinnedChatsSection, menuParent);

      // 获取固定聊天区域的列表容器，并克隆第一个列表项作为模板
      const pinnedChatsOl = pinnedChatsSection.querySelector("ol");

      pinnedChatsOl.innerHTML = "";
      pinnedChatsOl.id = pinnedChatsOrderListID;

      // 遍历历史固定聊天数据，生成列表项
      const pinnedChatsInfo = this.pinnedChatsDB.getAll();
      Object.keys(pinnedChatsInfo).forEach((chatId) => {
        this.#moveChatToPinnedSection(chatId);
      });
    }

    #updateSubTextNodeContent(domNode, newText) {
      // 创建 TreeWalker
      const walker = document.createTreeWalker(
        domNode, // 根节点
        NodeFilter.SHOW_TEXT, // 只筛选文本节点
        null,
        false
      );

      // 遍历文本节点
      while (walker.nextNode()) {
        const textNode = walker.currentNode;
        textNode.textContent = newText; // 修改文本内容
      }
    }

    #moveChatToPinnedSection(chatId) {
      const chatItem = document.querySelector(`a[href='/c/${chatId}']`)
        ?.parentElement?.parentElement;

      const pinnedChatsOl = document.getElementById(pinnedChatsOrderListID);
      pinnedChatsOl.appendChild(chatItem);
    }

    #moveChatOutOfPinnedSection(chatId, associatedH3Text) {
      const chatItem = document.querySelector(`a[href='/c/${chatId}']`)
        ?.parentElement?.parentElement;
      const h3Node = this.#findH3ByText(associatedH3Text);

      const preChatOl =
        h3Node[0].parentElement.parentElement.nextElementSibling;
      preChatOl.appendChild(chatItem);
    }

    // 大小写敏感的文本查找
    #findH3ByText(text) {
      const h3Elements = document.querySelectorAll("h3");
      const targetH3 = [];

      for (const h3 of h3Elements) {
        if (h3.textContent.trim() === text) {
          targetH3.push(h3);
        }
      }

      return targetH3;
    }
  }

  class DBService {
    /**
     * 添加一个键值对, 如果键已存在则覆盖
     * @param {string} key 键
     * @param {*} value 值
     */
    insert(key, value) {
      GM_setValue(key, value);
    }

    /**
     * 获取指定键的值
     * @param {string} key 键
     * @returns {*} 存储的值，如果键不存在则返回 undefined
     */
    get(key) {
      return GM_getValue(key, undefined);
    }

    /**
     * 检查键是否存在
     * @param {string} key 键
     * @returns {boolean} 是否存在
     */
    has(key) {
      return this.get(key) !== undefined;
    }

    /**
     * 删除指定键
     * @param {string} key 键
     */
    remove(key) {
      GM_deleteValue(key);
    }

    /**
     * 获取所有键值对
     * @returns {Object} 包含所有键值对的对象
     */
    getAll() {
      const allKeys = GM_listValues();
      const result = {};
      allKeys.forEach((key) => {
        result[key] = GM_getValue(key);
      });
      return result;
    }

    /**
     * 清空所有键值对
     */
    clear() {
      const allKeys = GM_listValues();
      allKeys.forEach((key) => {
        GM_deleteValue(key);
      });
    }
  }

  const db = new DBService();
  const manager = new sidebarManager(db, state);

  const run = () => {
    manager.initPinnedChatsSidebar();
    manager.addListenEventsOnClick();
    manager.addDomMutationObserver();
  };
  const observer = new MutationObserver(() => {
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(() => {
      run();
    }, 2000);
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
