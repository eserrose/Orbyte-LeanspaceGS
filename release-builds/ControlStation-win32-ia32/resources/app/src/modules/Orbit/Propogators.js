class Propogator {
    constructor(name) {
        this.name = name;
    }
}

const TWO_BODY = new Propogator("Two-Body");

const Propogators = {TWO_BODY};

export {Propogators};