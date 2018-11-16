// import { RetinalEncoder } from '../encoder';
import { DATA_UPDATE_COUNTER } from '../enums/defaults';
import { getEncoders, getBorders } from '../group-helper';
import ValueMatrix from './value-matrix';
import localOptions from './local-options';

const sanitizeRetinalConfig = (retinalConf) => {
    const conf = {};
    for (const key in retinalConf) {
        const confValue = retinalConf[key];
        if (typeof confValue === 'string' || !confValue) {
            conf[key] = {
                field: retinalConf[key]
            };
        } else {
            conf[key] = confValue;
        }
    }
    return conf;
};

/**
 *
 *
 * @param {*} placeholder
 * @memberof VisualGroup
 */
const setMatrixInstances = (context, placeholder) => {
    context._composition.matrices = {
        value: new ValueMatrix(placeholder.values),
        left: new ValueMatrix(placeholder.rows[0]),
        right: new ValueMatrix(placeholder.rows[1]),
        top: new ValueMatrix(placeholder.columns[0]),
        bottom: new ValueMatrix(placeholder.columns[1])
    };
    return context;
};

/**
 *
 *
 * @param {*} context
 * @returns
 */
export const setupChangeListeners = (context) => {
    context.store().registerImmediateListener([...Object.keys(localOptions), DATA_UPDATE_COUNTER], (...params) => {
        const datamodel = context.data();
        const [config, rows, columns, color, shape, size, detail, layers, transform] = params;

        if (datamodel && rows[1] && columns[1]) {
            // Get the resolver for the matrices
            const resolver = context.resolver();
            // Prepare configuration for matrix preparation
            let matrixConfig = {
                selection: context.selection(),
                alias: context.alias(),
                globalConfig: config[1] || {},
                rows: rows[1],
                columns: columns[1],
                detail: detail[1],
                layers: layers[1],
                transform: transform[1]
            };

            const retinalConfig = sanitizeRetinalConfig({
                color: color[1],
                shape: shape[1],
                size: size[1]
            });

            matrixConfig = Object.assign(matrixConfig, retinalConfig);
            // Create the encoders for the group
            // const encoders = {};
            const encoders = getEncoders(layers[1]);
            // encoders.retinalEncoder = new RetinalEncoder();
            // encoders.planarEncoder = getEncoder(layers[1]);

            // Set the group type
            context.groupType(encoders.planarEncoder.constructor.type());

            // Get sanitized fields as instances of the Vars Class
            const fields = encoders.planarEncoder.sanitizeFields(datamodel, matrixConfig);
            encoders.planarEncoder.setAxesAndHeaders(fields, config[1] ? config[1].axisFrom : {});
            // Setting layers for the code
            layers[1] && resolver.layerConfig(layers[1]);
            // Set the row and column axes
            resolver.horizontalAxis(fields.rows, encoders).verticalAxis(fields.columns, encoders);
            // Getting the placeholders
            const placeholderInfo = resolver.getMatrices(datamodel, matrixConfig, context.registry(), encoders);
            context._groupedDataModel = placeholderInfo.dataModels.groupedModel;
            // Set the selection object
            context.selection(placeholderInfo.selection);

            // Create retinal axes
            resolver.createRetinalAxes(placeholderInfo.dataModels.parentModel.getFieldsConfig(), retinalConfig,
                encoders);

            // Domains are evaluated for each of the axes for commonality
            resolver.setDomains(matrixConfig, placeholderInfo.dataModels, encoders);

            // Create matrix instances
            setMatrixInstances(context, placeholderInfo);

            // Prepare corner matrices
            context.cornerMatrices(resolver.createHeaders(placeholderInfo, fields, config[1]));

             // Set placeholder information
            context.placeholderInfo(placeholderInfo);

            context._composition.axes = resolver.axes();
            context.metaData({
                border: getBorders(placeholderInfo, encoders.planarEncoder)
            });
        }
        return context;
    });
    return context;
};
