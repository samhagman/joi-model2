require('babel-register');
const Joi = require('joi');
const util = require('util');
const _ = require('lodash');
const hashAString = require('string-hash');

const schema = Joi.object().keys({
    a: Joi.boolean().valid(true),
    b: Joi.alternatives().try([
        Joi.string().regex(/^a/),
        Joi.string().valid('boom')
    ]),
    c: Joi.number().valid(5),
    d: Joi.string().valid('key'),
    e: Joi.object().keys({
        hi:    Joi.string(),
        hello: Joi.number()
    })
});

// Cache of validated values for each model
const validatedValues = {};

function createJoiModel(schema, defaults) {

    // Check if schema is a Joi schema
    if (!schema.isJoi && !(schema._type === 'object')) {
        throw new Error('Schema passed to joi-model2 must be a Joi schema.');
    }

    // Check if default object is valid itself
    if (defaults) {
        const validation = Joi.validate(schema, defaults);
        if (validation.error) {
            throw new Error('JoiModel default values do not validate against given schema \n' + validation.error);
        }
    }

    // Create a shadow object that
    const shadowObj = _.cloneDeep(defaults || {});

    // TODO make real random UUIDs
    const modelUUID = '12345';
    let JoiModel = {
        _UUID: modelUUID,
        _shadowObj: shadowObj
    };

    // Create an object to store cached values
    validatedValues[ modelUUID ] = {};

    const keys = Object.keys(schema.children);

    for (let key of keys) {
        Object.defineProperty(JoiModel, key, {
            enumerable: true,
            get() {
                return this[key];
            },
            set(val) {
                const _this = this;
                const hash = hashAString(JSON.stringify(val));

                // If this value has already been validated for this key before, then just set the value
                if (validatedValues[ modelUUID ][hash]) {
                    return _this[ key ] = val;
                }

                // Do the validation against the shadow object
                const oldVal = _this[key];
                JoiModel._shadowObj[key] = val;
                const validation = Joi.validate(schema, JoiModel._shadowObj);
                if (validation.error) {
                    JoiModel._shadowObj[ key ] = oldVal;
                    throw new Error('Attempted to change a property to an invalid value: \n' + validation.error);
                }
                else {
                    // Cache the validated value
                    validatedValues[ modelUUID ][hash] = true;
                    return _this[ key ] = val;

                }
            }
        });
    }

    JoiModel.toJSON = function() {

    };

    return JoiModel;
}

export default createJoiModel;