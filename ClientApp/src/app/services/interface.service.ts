import { Injectable, EventEmitter } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class InterfaceService {

    constructor() {
        setInterval(() => {
            this.flash = !this.flash;
        }, 500);

        this.intersectionObserver = 
            new IntersectionObserver(entries => entries
                .filter (entry => this.intersectionSubscribers.has(entry.target))
                .map    (entry => ({ entry, sub: this.intersectionSubscribers.get(entry.target) }))
                .forEach(tuple => tuple.sub.next(tuple.entry)), 
            { threshold:  0.1 });
    }

    public flash: boolean = false;
    public ready: boolean = false;

    private intersectionObserver: IntersectionObserver;
    private intersectionSubscribers = new Map<Element, Subscriber<IntersectionObserverEntry>>();

    public observeIntersection(el: Element): Observable<IntersectionObserverEntry> {
        return new Observable((subscriber) => {
            this.intersectionSubscribers.set(el, subscriber);
            this.intersectionObserver.observe(el);
            
            return () => {
                this.intersectionSubscribers.delete(el);
                this.intersectionObserver.unobserve(el);
            };
        });
    }
}
