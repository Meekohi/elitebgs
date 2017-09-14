import { Component, OnInit, HostBinding } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';
import { FactionsService } from '../../services/factions.service';
import { SystemsService } from '../../services/systems.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    @HostBinding('class.content-area') contentArea = true;
    isAuthenticated: boolean;
    user: any;
    factions = [];
    systems = [];
    constructor(
        private authenticationService: AuthenticationService,
        private factionsService: FactionsService,
        private systemsService: SystemsService
    ) { }

    ngOnInit(): void {
        this.getAuthentication();
    }

    getAuthentication() {
        this.authenticationService
            .isAuthenticated()
            .subscribe(status => {
                this.isAuthenticated = status;
                if (this.isAuthenticated) {
                    this.getUser();
                } else {
                    this.user = {};
                    this.factions = [];
                    this.systems = [];
                }
            });
    }

    getUser() {
        this.authenticationService
            .getUser()
            .subscribe(user => {
                this.user = user;
                this.getFactions();
                this.getAddedSystems();
            });
    }

    getFactions() {
        if (this.user.factions) {
            this.user.factions.forEach(faction => {
                this.factionsService
                    .getHistory(faction.name, (Date.now() - 10 * 24 * 60 * 60 * 1000).toString(), Date.now().toString())
                    .subscribe(factions => {
                        factions.docs.forEach(gotFaction => {
                            gotFaction.faction_presence.forEach(system => {
                                this.getSystem(system.system_name);
                            });
                            let history: any[] = gotFaction.history;
                            let allSystems = [];
                            history.forEach(element => {
                                if (allSystems.indexOf(element.system) === -1) {
                                    allSystems.push(element.system);
                                }
                            });
                            let series = [];
                            history.sort((a, b) => {
                                if (a.updated_at < b.updated_at) {
                                    return -1;
                                } else if (a.updated_at > b.updated_at) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            });
                            allSystems.forEach(system => {
                                let data = [];
                                history.forEach(element => {
                                    if (element.system === system) {
                                        data.push([element.updated_at, Number.parseFloat((element.influence * 100).toFixed(2))])
                                    } else {
                                        if (element.systems.findIndex(systemElement => {
                                            return systemElement.name === system;
                                        }) === -1) {
                                            data.push(null);
                                        }
                                    }
                                });
                                series.push({
                                    name: system,
                                    data: data
                                });
                            });
                            gotFaction.factionOptions = {
                                title: { text: 'Influence trend' },
                                series: series
                            };
                            this.factions.push(gotFaction);
                        });
                    })
            });
        }
    }

    getSystem(system: string) {
        this.systemsService
            .getHistory(system, (Date.now() - 10 * 24 * 60 * 60 * 1000).toString(), Date.now().toString())
            .subscribe(systems => {
                systems.docs.forEach(gotSystem => {
                    if (this.systems.findIndex(systemElement => {
                        return systemElement.name === system;
                    }) === -1) {
                        let length = this.systems.push(gotSystem);
                        gotSystem.factions.forEach(faction => {
                            this.factionsService
                                .getFactions('1', faction.name_lower)
                                .subscribe(factions => {
                                    this.systems[length - 1].factions.forEach((factionInSystem, index, array) => {
                                        if (factionInSystem.name_lower === faction.name_lower) {
                                            factions.docs[0].faction_presence.forEach(presence => {
                                                if (presence.system_name_lower === gotSystem.name_lower) {
                                                    array[index].influence = presence.influence;
                                                    array[index].state = presence.state;
                                                    array[index].pending_states = presence.pending_states;
                                                    array[index].recovering_states = presence.recovering_states;
                                                }
                                            });
                                        }
                                    });
                                })
                        });
                    }
                })
            })
    }

    getAddedSystems() {
        this.user.systems.forEach(system => {
            this.getSystem(system);
        })
    }
}
