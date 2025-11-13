export function confirmModal({title='Confirm', text='Are you sure?'}){ /* вернуть Promise<boolean> */ }
export function promptModal({title='Title', label='Text', initial=''}){ /* Promise<string|null> */ }
export function cardEditorModal({text='', img=''}){ /* Promise<{text,img} | null> */ }

// scripts/ui/modal.js
// Управление всеми модальными окнами (профиль, помощь, уведомления)

function closeAllModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.classList.remove("active");
        modal.style.top = "";
        modal.style.left = "";
    });
}

function positionModal(modal, triggerRect, alignRight = false) {
    modal.classList.add("active");
    modal.style.top = "0px";
    modal.style.left = "-9999px";

    const modalRect = modal.getBoundingClientRect();

    let top = triggerRect.bottom + 10;
    let left = alignRight
        ? triggerRect.right - modalRect.width
        : triggerRect.left + triggerRect.width / 2 - modalRect.width / 2;

    if (left + modalRect.width > window.innerWidth - 20)
        left = window.innerWidth - modalRect.width - 20;
    if (left < 20) left = 20;

    if (top + modalRect.height > window.innerHeight - 20) {
        const above = triggerRect.top - modalRect.height - 10;
        top = above >= 20 ? above : window.innerHeight - modalRect.height - 20;
    }

    modal.style.top = `${top}px`;
    modal.style.left = `${left}px`;
}

function openModal(modalId, triggerElement) {
    closeAllModals();

    const modal = document.getElementById(modalId);
    if (!modal) return;

    const rect = triggerElement.getBoundingClientRect();
    const alignRight = modalId === "profileModal";

    positionModal(modal, rect, alignRight);
}

export function initModals() {
    const notificationIcon = document.getElementById("notificationIcon");
    const helpIcon = document.getElementById("helpIcon");
    const profileIcon = document.getElementById("profileIcon");

    if (notificationIcon)
        notificationIcon.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal("notificationModal", notificationIcon);
        });

    if (helpIcon)
        helpIcon.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal("helpModal", helpIcon);
        });

    if (profileIcon)
        profileIcon.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal("profileModal", profileIcon);
        });

    // help modal actions
    document.querySelectorAll("#helpModal p[data-action]").forEach((item) => {
        item.addEventListener("click", () => {
            const action = item.dataset.action;
            closeAllModals();

            if (action === "help-center")
                window.open("https://support.atlassian.com/trello/", "_blank");

            if (action === "hotkeys") {
                alert(
                    "Горячие клавиши:\n\n" +
                        "N - Новая карточка\n" +
                        "F - Поиск\n" +
                        "B - Переключить доски\n" +
                        "/ - Поиск\n" +
                        "Esc - Закрыть модалку"
                );
            }
        });
    });

    // profile modal actions
    document.querySelectorAll("#profileModal p[data-action]").forEach((item) => {
        item.addEventListener("click", () => {
            const action = item.dataset.action;
            closeAllModals();

            switch (action) {
                case "logout":
                    if (confirm("Выйти из аккаунта?"))
                        window.location.href = "index.html";
                    break;

                case "manage-account":
                    alert("Тут будет управление аккаунтом");
                    break;

                case "switch-account":
                    alert("Переключение аккаунтов (в разработке)");
                    break;

                case "settings":
                    alert("Настройки аккаунта (в разработке)");
                    break;

                case "shortcuts":
                    alert(
                        "Горячие клавиши:\n\n" +
                            "N — Новая карточка\n" +
                            "F — Поиск\n" +
                            "B — Доски\n" +
                            "/ — Фокус на поиск\n" +
                            "Esc — Закрыть\n" +
                            "C — Архивировать карточку\n" +
                            "E — Быстрое редактирование"
                    );
                    break;

                case "help":
                    window.open("https://support.atlassian.com/trello/", "_blank");
                    break;
            }
        });
    });

    // close on outside click
    document.addEventListener("click", (e) => {
        if (
            !e.target.closest(".modal") &&
            !e.target.closest(".header-right i") &&
            !e.target.closest(".user-avatar")
        ) {
            closeAllModals();
        }
    });
}
