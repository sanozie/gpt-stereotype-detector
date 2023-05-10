export type StereotypeData = 'text' | 'gender' | 'age' | 'race' | 'politics' | 'friendly' | 'trustworthy' | 'confident' | 'competent' | 'wealthy' | 'conservative' | 'religious'

export type Stereotype = {
    text: string;
    gender: string;
    age: string;
    race: string;
    politics: string;
    friendly: string;
    trustworthy: string;
    confident: string;
    competent: string;
    wealthy: string;
    conservative: string;
    religious: string;
}

export type StereotypeVector = Stereotype & { embedding?: number[], id: string }

export type StereotypeSearch = StereotypeVector & { similarity?: number }