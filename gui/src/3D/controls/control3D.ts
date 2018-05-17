/// <reference path="../../../../dist/preview release/babylon.d.ts"/>

module BABYLON.GUI {
    /**
     * Class used as base class for controls
     */
    export class Control3D implements IDisposable, IBehaviorAware<Control3D> {
        /** @hidden */
        public _host: GUI3DManager;
        private _mesh: Nullable<Mesh>;
        private _downCount = 0;
        private _enterCount = 0;
        private _downPointerIds:{[id:number] : boolean} = {};
        private _isVisible = true;
        
        /**
        * An event triggered when the pointer move over the control.
        */
       public onPointerMoveObservable = new Observable<Vector3>();

       /**
       * An event triggered when the pointer move out of the control.
       */
       public onPointerOutObservable = new Observable<Control3D>();

       /**
       * An event triggered when the pointer taps the control
       */
       public onPointerDownObservable = new Observable<Vector3WithInfo>();

       /**
       * An event triggered when pointer up
       */
       public onPointerUpObservable = new Observable<Vector3WithInfo>();

       /**
       * An event triggered when a control is clicked on
       */
       public onPointerClickObservable = new Observable<Vector3WithInfo>();

       /**
       * An event triggered when pointer enters the control
       */
       public onPointerEnterObservable = new Observable<Control3D>();
       

        /**
         * Gets or sets the parent container
         */
        public parent: Nullable<Container3D>;

        // Behaviors
        private _behaviors = new Array<Behavior<Control3D>>();

        /**
         * Gets the list of attached behaviors
         * @see http://doc.babylonjs.com/features/behaviour
         */
        public get behaviors(): Behavior<Control3D>[] {
            return this._behaviors;
        }        

        /**
         * Attach a behavior to the control
         * @see http://doc.babylonjs.com/features/behaviour
         * @param behavior defines the behavior to attach
         * @returns the current control
         */
        public addBehavior(behavior: Behavior<Control3D>): Control3D {
            var index = this._behaviors.indexOf(behavior);

            if (index !== -1) {
                return this;
            }

            behavior.init();
            let scene = this._host.scene;
            if (scene.isLoading) {
                // We defer the attach when the scene will be loaded
                scene.onDataLoadedObservable.addOnce(() => {
                    behavior.attach(this);
                });
            } else {
                behavior.attach(this);
            }
            this._behaviors.push(behavior);

            return this;
        }

        /**
         * Remove an attached behavior
         * @see http://doc.babylonjs.com/features/behaviour
         * @param behavior defines the behavior to attach
         * @returns the current control
         */
        public removeBehavior(behavior: Behavior<Control3D>): Control3D {
            var index = this._behaviors.indexOf(behavior);

            if (index === -1) {
                return this;
            }

            this._behaviors[index].detach();
            this._behaviors.splice(index, 1);

            return this;
        }        

        /**
         * Gets an attached behavior by name
         * @param name defines the name of the behavior to look for
         * @see http://doc.babylonjs.com/features/behaviour
         * @returns null if behavior was not found else the requested behavior
         */
        public getBehaviorByName(name: string): Nullable<Behavior<Control3D>> {
            for (var behavior of this._behaviors) {
                if (behavior.name === name) {
                    return behavior;
                }
            }

            return null;
        }      
        
        /** Gets or sets a boolean indicating if the control is visible */
        public get isVisible(): boolean {
            return this._isVisible;
        }

        public set isVisible(value: boolean) {
            if (this._isVisible === value) {
                return;
            }

            this._isVisible = value;
            if (this._mesh) {
                this._mesh.isVisible = value;
            }
        }

        /**
         * Creates a new control
         * @param name defines the control name
         */
        constructor(
            /** Defines the control name */
            public name?: string) {
        }

        /**
         * Gets a string representing the class name
         */
        public get typeName(): string {
            return this._getTypeName();
        }

        protected _getTypeName(): string {
            return "Control3D";
        }

        /**
         * Get the attached mesh used to render the control
         * @param scene defines the scene where the mesh must be attached
         * @returns the attached mesh or null if none
         */        
        public getAttachedMesh(scene: Scene): Nullable<Mesh> {
            if (!this._mesh) {
                this._mesh = this._createMesh(scene);
                this._mesh!.isPickable = true;
                this._mesh!.metadata = this; // Store the control on the metadata field in order to get it when picking
            }

            return this._mesh;
        }

        /**
         * Mesh creation.
         * Can be overriden by children
         * @param scene defines the scene where the mesh must be attached
         * @returns the attached mesh or null if none
         */
        protected _createMesh(scene: Scene): Nullable<Mesh> {
            // Do nothing by default
            return null;
        }

        // Pointers

        /** @hidden */
        public _onPointerMove(target: Control3D, coordinates: Vector3): void {
            var canNotify: boolean = this.onPointerMoveObservable.notifyObservers(coordinates, -1, target, this);

            if (canNotify && this.parent != null) this.parent._onPointerMove(target, coordinates);
        }

        /** @hidden */
        public _onPointerEnter(target: Control3D): boolean {
            if (this._enterCount !== 0) {
                return false;
            }

            this._enterCount++;

            var canNotify: boolean = this.onPointerEnterObservable.notifyObservers(this, -1, target, this);

            if (canNotify && this.parent != null) this.parent._onPointerEnter(target);

            return true;
        }

        /** @hidden */
        public _onPointerOut(target: Control3D): void {
            this._enterCount = 0;

            var canNotify: boolean = this.onPointerOutObservable.notifyObservers(this, -1, target, this);

            if (canNotify && this.parent != null) this.parent._onPointerOut(target);
        }

        /** @hidden */
        public _onPointerDown(target: Control3D, coordinates: Vector3, pointerId:number, buttonIndex: number): boolean {
            if (this._downCount !== 0) {
                return false;
            }

            this._downCount++;

            this._downPointerIds[pointerId] = true;

            var canNotify: boolean = this.onPointerDownObservable.notifyObservers(new Vector3WithInfo(coordinates, buttonIndex), -1, target, this);

            if (canNotify && this.parent != null) this.parent._onPointerDown(target, coordinates, pointerId, buttonIndex);

            return true;
        }

        /** @hidden */
        public _onPointerUp(target: Control3D, coordinates: Vector3, pointerId:number, buttonIndex: number, notifyClick: boolean): void {
            this._downCount = 0;

            delete this._downPointerIds[pointerId];

            var canNotifyClick: boolean = notifyClick;
			if (notifyClick && this._enterCount > 0) {
				canNotifyClick = this.onPointerClickObservable.notifyObservers(new Vector3WithInfo(coordinates, buttonIndex), -1, target, this);
			}
			var canNotify: boolean = this.onPointerUpObservable.notifyObservers(new Vector3WithInfo(coordinates, buttonIndex), -1, target, this);

            if (canNotify && this.parent != null) this.parent._onPointerUp(target, coordinates, pointerId, buttonIndex, canNotifyClick);
        }  
        
        /** @hidden */
        public _processObservables(type: number, pickedPoint: Vector3, pointerId:number, buttonIndex: number): boolean {
            if (type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this._onPointerMove(this, pickedPoint);

                var previousControlOver = this._host._lastControlOver[pointerId];
                if (previousControlOver && previousControlOver !== this) {
                    previousControlOver._onPointerOut(this);
                }

                if (previousControlOver !== this) {
                    this._onPointerEnter(this);
                }

                this._host._lastControlOver[pointerId] = this;
                return true;
            }

            if (type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this._onPointerDown(this, pickedPoint, pointerId, buttonIndex);
                this._host._lastControlDown[pointerId] = this;
                this._host._lastPickedControl = this;
                return true;
            }

            if (type === BABYLON.PointerEventTypes.POINTERUP) {
                if (this._host._lastControlDown[pointerId]) {
                    this._host._lastControlDown[pointerId]._onPointerUp(this, pickedPoint, pointerId, buttonIndex, true);
                }
                delete this._host._lastControlDown[pointerId];
                return true;
            }

            return false;
        }        

        /**
         * Releases all associated resources
         */
        public dispose() {
            this.onPointerDownObservable.clear();
            this.onPointerEnterObservable.clear();
            this.onPointerMoveObservable.clear();
            this.onPointerOutObservable.clear();
            this.onPointerUpObservable.clear();
            this.onPointerClickObservable.clear();

            // Behaviors
            for (var behavior of this._behaviors) {
                behavior.detach();
            }
        }
    }
}