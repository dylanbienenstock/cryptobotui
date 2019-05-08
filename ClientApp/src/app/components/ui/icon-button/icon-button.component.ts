import { Component, Input, OnDestroy } from '@angular/core';
import { ButtonMarkup } from '../button/button.component';
import { Router, NavigationEnd, ActivatedRoute, RoutesRecognized } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageRoutes } from 'src/app/app.routes';

@Component({
    selector: 'app-icon-button',
    templateUrl: './icon-button.component.html',
    styleUrls: ['./icon-button.component.scss']
})
export class IconButtonComponent implements OnDestroy {

    constructor(private router: Router, private activatedRoute: ActivatedRoute) {
        this.routeDataSub = router.events
            .subscribe(this.onRouterEvent.bind(this));
    }

    @Input() markup: ButtonMarkup;

    public pageRoutes = PageRoutes;
    public currentPage: string;
    private routeDataSub: Subscription;

    ngOnDestroy(): void {
        this.routeDataSub.unsubscribe();
    }

    private onRouterEvent(e: Event): void {
        if (e instanceof RoutesRecognized)
            this.currentPage = e.state.root.firstChild.data.page;
    }
}
