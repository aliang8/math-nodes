/**
 * Functions to build nodes
 */

const q = require('./query.js')

export const apply = (op, args, options = {}) => ({
    type: 'Apply',
    op: op,
    args: args,
    ...options,
})

// Operations

export const neg = (arg, options = {}) => apply('neg', [arg], options)      // options: wasMinus
export const add = (...terms) => apply('add', terms)
export const sub = (minuend, subtrahend) => apply('add', [minuend, neg(subtrahend, {wasMinus: true})])
export const mul = (...args) => apply('mul', args)
export const implicitMul = (...args) => apply('mul', args, {implicit: true})
export const div = (numerator, denominator) => apply('div', [numerator, denominator])
export const pow = (base, exponent) => apply('pow', [base, exponent])
export const abs = (arg) => apply('abs', [arg])
export const fact = (arg) => apply('fact', [arg])
export const nthRoot = (radicand, index) => apply('nthRoot', [radicand, index || number('2')])

// Relations

export const eq = (...args) => apply('eq', args)
export const ne = (...args) => apply('ne', args)
export const lt = (...args) => apply('lt', args)
export const le = (...args) => apply('le', args)
export const gt = (...args) => apply('gt', args)
export const ge = (...args) => apply('ge', args)


export const identifier = (name, options = {}) => ({
    type: 'Identifier',
    name: name,
    ...options, // options: subscript
})

export const number = (value, options = {}) => ({
    type: 'Number',
    value: String(value),
    ...options,
})


export const parens = (body, options = {}) => ({
    type: 'Parentheses',
    body: body,
    ...options,
})

// deprecated aliases
export const parensNode = parens
export const numberNode = number
export const identifierNode = identifier
export const applyNode = apply

// e.g 3 -> -3, -3x -> 3x, x + 3 -> -(x + 3), 2/3 -> -2 / 3
export const negate = (node) => {
    if (q.isNeg(node)) {
        return node.args[0]
    } else if (q.isAdd(node)) {
        return neg(node)
    } else if (q.isFraction(node)) {
        return div(negate(q.getNumerator(node)), q.getDenominator(node))
    } else if (q.isPolynomialTerm(node)) {
        if (q.isNeg(q.getCoefficient(node))) {
            return apply(
                'mul',
                [negate(q.getCoefficient(node)), ...node.args.slice(1)],
                {implicit: node.implicit})
        } else {
            return neg(node)
        }
    } 
}
