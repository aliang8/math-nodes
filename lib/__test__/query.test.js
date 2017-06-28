import assert from 'assert'
import {parse} from 'math-parser'

import * as query from '../query'

describe('query', () => {
    let a, x, y

    beforeEach(() => {
        a = {type: 'Number', value: '5'}
        x = {type: 'Identifier', name: 'x'}
        y = {type: 'Identifier', name: 'y'}
    })

    it('isIdentifier', () => {
        assert(query.isIdentifier(x))
        assert(!query.isIdentifier(a))
    })

    it('isApply', () => {
        assert(query.isApply({type: 'Apply'}))
        assert(!query.isApply(a))
        assert(!query.isApply(x))
    })

    it('isFunction', () => {
        assert(query.isFunction({
            type: 'Apply',
            op: {type: 'Identifier', name: 'sin'},
            args: [x],
        }))
        assert(!query.isFunction({type: 'Apply', op: 'sin'}))
    })

    it('isAdd', () => {
        assert(query.isAdd(parse('1 + 2')))
        assert(query.isAdd(parse('1 + 2 + x + y')))
        // This is b/c subtraction get's parsed as adding a negative
        assert(query.isAdd(parse('1 - 2')))
    })

    it('isMul', () => {
        assert(query.isMul(parse('2 * x')))
        assert(query.isMul(parse('2 x')))
    })

    it('isDiv', () => {
        assert(query.isDiv(parse('x / y')))
    })

    it('isNeg', () => {
        assert(query.isNeg(parse('-x')))
        assert(query.isNeg(parse('-2')))
        // Even though this resolves to a positive 'x', we only check the given
        // node.
        assert(query.isNeg(parse('--x')))
    })

    it('isPos', () => {
        assert(query.isPos(parse('+x')))
        assert(query.isPos(parse('+2')))
        assert(query.isPos(parse('++x')))
    })

    it('isAbs', () => {
        assert(query.isAbs(parse('|x + y|')))
    })

    it('isFact', () => {
        assert(query.isFact(parse('x!')))
    })

    it('isNthRoot', () => {
        assert(query.isNthRoot(parse('nthRoot(4)')))
        assert(query.isNthRoot(parse('nthRoot(8, 3)')))
    })

    it('isFraction', () => {
        assert(query.isFraction(parse('2 / 3')))
        assert(query.isFraction(parse('-2 / 3')))
        assert(query.isFraction(parse('-(2 / 3)')))
        assert(query.isFraction(parse('--(2 / 3)')))
    })

    it('isDecimal', () => {
        assert(query.isDecimal(parse('-2.2')))
        assert(query.isDecimal(parse('2.2')))
        assert(!query.isDecimal(parse('-2')))
        assert(!query.isDecimal(parse('2')))
    })

    const relations = ['eq', 'ne', 'lt', 'le', 'gt', 'ge']

    it('isRel', () => {
        relations.forEach(rel => {
            assert(query.isRel({
                type: 'Apply',
                op: rel,
                args: [x, y]
            }))
        })
        assert(!query.isRel(a))
        assert(!query.isRel(x))
    })

    it('isNumber', () => {
        assert(query.isNumber(a))
        assert(query.isNumber(parse('-2')))
        assert(!query.isNumber(x))
    })

    it('getValue', () => {
        assert.equal(query.getValue(parse('2')), 2)
        assert.equal(query.getValue(parse('-2')), -2)
        assert.equal(query.getValue(parse('2.2')), 2.2)
        assert.equal(query.getValue(parse('-2.2')), -2.2)
        assert.equal(query.getValue(x), null)
    })

    it('getNumerator', () => {
        assert.deepEqual(query.getNumerator(parse('2/3')), parse('2'))
        assert.deepEqual(query.getNumerator(parse('-2/3')), parse('-2'))
        assert.deepEqual(query.getNumerator(parse('-(2/3)')), parse('2'))
        assert.equal(query.getNumerator(x), null)
    })

    it('getDenominator', () => {
        assert.deepEqual(query.getDenominator(parse('2/3')), parse('3'))
        assert.deepEqual(query.getDenominator(parse('2/-3')), parse('-3'))
        assert.deepEqual(query.getDenominator(parse('-(2/3)')), parse('3'))
        assert.equal(query.getDenominator(x), null)
    })
})