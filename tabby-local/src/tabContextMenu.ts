import { Inject, Injectable, Optional } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, BaseTabComponent, TabContextMenuItemProvider, NotificationsService, MenuItemOptions, ProfilesService, PromptModalComponent, TranslateService } from 'tabby-core'
import { TerminalTabComponent } from './components/terminalTab.component'
import { TerminalService } from './services/terminal.service'
import { LocalProfile, UACService } from './api'

/** @hidden */
@Injectable()
export class SaveAsProfileContextMenu extends TabContextMenuItemProvider {
    constructor (
        private config: ConfigService,
        private ngbModal: NgbModal,
        private notifications: NotificationsService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        if (!(tab instanceof TerminalTabComponent)) {
            return []
        }
        const terminalTab = tab
        const items: MenuItemOptions[] = [
            {
                label: this.translate.instant('Save as profile'),
                click: async () => {
                    const modal = this.ngbModal.open(PromptModalComponent)
                    modal.componentInstance.prompt = this.translate.instant('New profile name')
                    const name = (await modal.result)?.value
                    if (!name) {
                        return
                    }
                    const profile = {
                        options: {
                            ...terminalTab.profile.options,
                            cwd: await terminalTab.session?.getWorkingDirectory() ?? terminalTab.profile.options.cwd,
                        },
                        name,
                        type: 'local',
                    }
                    this.config.store.profiles = [
                        ...this.config.store.profiles,
                        profile,
                    ]
                    this.config.save()
                    this.notifications.info(this.translate.instant('Saved'))
                },
            },
        ]

        return items
    }
}

/** @hidden */
@Injectable()
export class NewTabContextMenu extends TabContextMenuItemProvider {
    weight = 10

    constructor (
        public config: ConfigService,
        private profilesService: ProfilesService,
        private terminalService: TerminalService,
        @Optional() @Inject(UACService) private uac: UACService|undefined,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent, tabHeader?: boolean): Promise<MenuItemOptions[]> {
        const profiles = (await this.profilesService.getProfiles()).filter(x => x.type === 'local') as LocalProfile[]

        const items: MenuItemOptions[] = [
            {
                label: this.translate.instant('New terminal'),
                click: () => {
                    if (tab instanceof TerminalTabComponent) {
                        this.profilesService.openNewTabForProfile(tab.profile)
                    } else {
                        this.terminalService.openTab()
                    }
                },
            },
            {
                label: this.translate.instant('New with profile'),
                submenu: profiles.map(profile => ({
                    label: profile.name,
                    click: async () => {
                        let workingDirectory = profile.options.cwd
                        if (!workingDirectory && tab instanceof TerminalTabComponent) {
                            workingDirectory = await tab.session?.getWorkingDirectory() ?? undefined
                        }
                        await this.terminalService.openTab(profile, workingDirectory)
                    },
                })),
            },
        ]

        if (this.uac?.isAvailable) {
            items.push({
                label: this.translate.instant('New admin tab'),
                submenu: profiles.map(profile => ({
                    label: profile.name,
                    click: () => {
                        this.profilesService.openNewTabForProfile({
                            ...profile,
                            options: {
                                ...profile.options,
                                runAsAdministrator: true,
                            },
                        })
                    },
                })),
            })
        }

        if (tab instanceof TerminalTabComponent && tabHeader && this.uac?.isAvailable) {
            const terminalTab = tab
            items.push({
                label: this.translate.instant('Duplicate as administrator'),
                click: () => {
                    this.profilesService.openNewTabForProfile({
                        ...terminalTab.profile,
                        options: {
                            ...terminalTab.profile.options,
                            runAsAdministrator: true,
                        },
                    })
                },
            })
        }

        return items
    }
}
