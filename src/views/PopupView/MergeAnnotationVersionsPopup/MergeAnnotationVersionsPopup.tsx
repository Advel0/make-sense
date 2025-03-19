import React, { useState } from 'react';
import './MergeAnnotationVersionsPopup.scss';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import { GenericYesNoPopup } from '../GenericYesNoPopup/GenericYesNoPopup';
import { PopupWindowType } from '../../../data/enums/PopupWindowType';
import { updateActivePopupType } from '../../../store/general/actionCreators';

import {submitNewNotification} from '../../../store/notifications/actionCreators';
import {INotification} from '../../../store/notifications/types';

import { PopupActions } from '../../../logic/actions/PopupActions';
import { StyledTextField } from '../../Common/StyledTextField/StyledTextField';
import {LabelsSelector} from '../../../store/selectors/LabelsSelector';
import { RectLabelsExporter } from '../../../logic/export/RectLabelsExporter';
import { ImporterSpecData } from '../../../data/ImporterSpecData';
import {AnnotationFormatType} from '../../../data/enums/AnnotationFormatType';
import { LabelType } from '../../../data/enums/LabelType';
import { ImageData, LabelName } from '../../../store/labels/types';
import { updateActiveLabelType, updateImageData, updateLabelNames } from '../../../store/labels/actionCreators';

interface IProps {
    updateActivePopupTypeAction: (activePopupType: PopupWindowType) => any;
    submitNewNotificationAction: (notification: INotification) => any;
    updateImageDataAction: (imageData: ImageData[]) => any,
    updateLabelNamesAction: (labels: LabelName[]) => any,
}

const LoadLabelNamesPopup: React.FC<IProps> = (
    { updateActivePopupTypeAction, submitNewNotificationAction, updateImageDataAction, updateLabelNamesAction}
) => {
    const [newVersionName, setNewVersionName] = useState('');

    const onAccept = () => {
        if (newVersionName) {
            PopupActions.close();
        }
    };

    const onReject = () => {
        console.log()
        const filesData = LabelsSelector.getImagesData()
        const mergedFiles = []
        
        

        for (const fileData of filesData) {
            const fileContent: string = RectLabelsExporter.wrapRectLabelsIntoYOLO(fileData);
            if (fileContent) {
                const mergedFileContent = fileContent.split('\n').map(line => {
                    return line.replace(/^\d+/, '0');
                }).join('\n');

                const mergedFile = new File([mergedFileContent], fileData.fileData.name.replace(/\.[^/.]+$/, '.txt'), {
                    type: 'text/plain',
                });
                // console.log()
                mergedFiles.push(mergedFile)
            }
        }

        const labelsFile = new File(["object"], "labels.txt", {
            type: 'text/plain',
        });
        mergedFiles.push(labelsFile)
        const importer = new (ImporterSpecData[AnnotationFormatType.YOLO])([LabelType.RECT]);
        importer.import(mergedFiles, ()=>{console.log("success")}, ()=>{console.log("fail")});
        console.log(mergedFiles)
        console.log("merged")
        console.log(updateImageDataAction)
        updateImageDataAction(mergedFiles);
        // updateLabelNamesAction(loadedLabelNames);
        // updateActiveLabelTypeAction(type);

        PopupActions.close();
    };

    

    const renderContent = () => {
        return (
        <div className='LoadLabelsPopupContent'>
                <div className='LabelEntry' key={'temp'}>
                        <StyledTextField variant='standard'
                            id={'key'}
                            autoComplete={'off'}
                            autoFocus={true}
                            type={'text'}
                            margin={'dense'}
                            label={'Type new annotation version name'}
                            onKeyUp={()=>{}}
                            value={()=>{}}
                            onChange={()=>{}}
                            style={{ width: 280 }}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                </div>
            <div className='Message'>
                Description
            </div>
        </div>);
    };

    return (
        <GenericYesNoPopup
            title={'Merge annotation versions'}
            renderContent={renderContent}
            acceptLabel={'Merge'}
            onAccept={onAccept}
            disableAcceptButton={newVersionName === ''}
            rejectLabel={'Cancel'}
            onReject={onReject}
        />
    );
};

const mapDispatchToProps = {
    updateActivePopupTypeAction: updateActivePopupType,
    submitNewNotificationAction: submitNewNotification,
    updateImageDataAction: updateImageData, // Ensure this line is present
    updateLabelNamesAction: updateLabelNames
};


const mapStateToProps = (state: AppState) => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LoadLabelNamesPopup);


