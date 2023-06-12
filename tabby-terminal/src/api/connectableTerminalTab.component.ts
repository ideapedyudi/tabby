import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker'

import { Injector, Component } from '@angular/core'

import { first } from 'rxjs'

import { BaseTerminalProfile } from './interfaces'
import { BaseTerminalTabComponent } from './baseTerminalTab.component'
import { GetRecoveryTokenOptions, RecoveryToken } from 'tabby-core'


/**
 * A class to base your custom connectable terminal tabs on
 */
@Component({ template: '' })
export abstract class ConnectableTerminalTabComponent<P extends BaseTerminalProfile> extends BaseTerminalTabComponent<P> {

    protected reconnectOffered = false

    constructor (protected injector: Injector) {
        super(injector)

        this.subscribeUntilDestroyed(this.hotkeys.hotkey$, hotkey => {
            if (this.hasFocus && hotkey === 'reconnect-tab') {
                this.reconnect()
            }
        })
    }

    ngOnInit (): void {
        this.logger = this.log.create(`${this.profile.type}Tab`)

        super.ngOnInit()
    }

    protected onFrontendReady (): void {
        this.initializeSession()
        super.onFrontendReady()
    }

    /**
    * Initialize Connectable Session.
    * Set reconnectOffered to false
    */
    async initializeSession (): Promise<void> {
        this.reconnectOffered = false
    }

    /**
    * Method called when session is destroyed. Handle the tab behavior on session end for connectable tab
    */
    protected onSessionDestroyed (): void {
        super.onSessionDestroyed()

        if (this.frontend) {
            if (this.profile.behaviorOnSessionEnd === 'reconnect') {
                this.reconnect()
            } else if (this.profile.behaviorOnSessionEnd === 'keep' || this.profile.behaviorOnSessionEnd === 'auto' && !this.isSessionExplicitlyTerminated()) {
                this.offerReconnection()
            }
        }
    }

    /**
    * Offering reconnection to the user if it hasn't been done yet.
    * Set reconnectOffered to true
    */
    offerReconnection (): void {
        if (!this.reconnectOffered) {
            this.reconnectOffered = true
            this.write(this.translate.instant(_('Press any key to reconnect')) + '\r\n')
            this.input$.pipe(first()).subscribe(() => {
                if (!this.session?.open && this.reconnectOffered) {
                    this.reconnect()
                }
            })
        }
    }

    async getRecoveryToken (options?: GetRecoveryTokenOptions): Promise<RecoveryToken> {
        return {
            type: `app:${this.profile.type}-tab`,
            profile: this.profile,
            savedState: options?.includeState && this.frontend?.saveState(),
        }
    }

    async reconnect (): Promise<void> {
        this.session?.destroy()
        await this.initializeSession()
        this.session?.releaseInitialDataBuffer()
    }

}
