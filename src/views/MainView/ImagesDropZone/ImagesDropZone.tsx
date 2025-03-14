import React, { useState, useEffect } from 'react';
import './ImagesDropZone.scss';
import { TextButton } from '../../Common/TextButton/TextButton';
import { ImageData } from '../../../store/labels/types';
import { connect } from 'react-redux';
import { addImageData, updateActiveImageIndex } from '../../../store/labels/actionCreators';
import { AppState } from '../../../store';
import { ProjectType } from '../../../data/enums/ProjectType';
import { PopupWindowType } from '../../../data/enums/PopupWindowType';
import { updateActivePopupType, updateProjectData } from '../../../store/general/actionCreators';
import { ProjectData } from '../../../store/general/types';
import { ImageDataUtil } from '../../../utils/ImageDataUtil';
import { sortBy } from 'lodash';

interface IProps {
    updateActiveImageIndexAction: (activeImageIndex: number) => any;
    addImageDataAction: (imageData: ImageData[]) => any;
    updateProjectDataAction: (projectData: ProjectData) => any;
    updateActivePopupTypeAction: (activePopupType: PopupWindowType) => any;
    projectData: ProjectData;
}

const ImagesDropZone: React.FC<IProps> = (props: IProps) => {
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    // Fetch image file locations from the server
    useEffect(() => {
        fetch('https://serverurl/get-images')  // Replace with the correct server API that returns image file paths
            .then(response => response.json())
            .then(data => {
                loadImageFiles(data);
            })
            .catch(error => {
                console.error('Error fetching images:', error);
            });
    }, []);

    // Load image files from URLs and convert them into File objects
    const loadImageFiles = async (imagePaths: string[]) => {
        const files: File[] = [];
        for (const imagePath of imagePaths) {
            try {
                const response = await fetch(`${imagePath}`);  // Assuming `/images/{imagePath}` is the URL to fetch the image
                const blob = await response.blob();
                const file = new File([blob], imagePath, { type: blob.type });
                files.push(file);
            } catch (error) {
                console.error(`Failed to load image ${imagePath}:`, error);
            }
        }
        setImageFiles(files);
    };

    const startEditor = (projectType: ProjectType) => {
        if (imageFiles.length > 0) {
            const sortedFiles = sortBy(imageFiles, (item: File) => item.name);
            props.updateProjectDataAction({
                ...props.projectData,
                type: projectType
            });
            props.updateActiveImageIndexAction(0);
            props.addImageDataAction(sortedFiles.map((file: File) => ImageDataUtil.createImageDataFromFileData(file)));
            props.updateActivePopupTypeAction(PopupWindowType.INSERT_LABEL_NAMES);
        }
    };

    const startEditorWithObjectDetection = () => startEditor(ProjectType.OBJECT_DETECTION);
    const startEditorWithImageRecognition = () => startEditor(ProjectType.IMAGE_RECOGNITION);

    const getDropZoneContent = () => {
        if (imageFiles.length === 0)
            return (
                <>
                    <img draggable={false} alt="upload" src="ico/box-opened.png" />
                    <p className="extraBold">Loading images</p>
                    <p>or</p>
                    <p className="extraBold">Click here to select them</p>
                </>
            );
        else if (imageFiles.length === 1)
            return (
                <>
                    <img draggable={false} alt="uploaded" src="ico/box-closed.png" />
                    <p className="extraBold">1 image loaded</p>
                </>
            );
        else
            return (
                <>
                    <img draggable={false} key={1} alt="uploaded" src="ico/box-closed.png" />
                    <p key={2} className="extraBold">{imageFiles.length} images loaded</p>
                </>
            );
    };

    return (
        <div className="ImagesDropZone">
            <div className="DropZone">
                {getDropZoneContent()}
            </div>

            <div className="DropZoneButtons">
                <TextButton
                    label="Object Detection"
                    isDisabled={imageFiles.length === 0}
                    onClick={startEditorWithObjectDetection}
                />
                <TextButton
                    label="Image Recognition"
                    isDisabled={imageFiles.length === 0}
                    onClick={startEditorWithImageRecognition}
                />
            </div>
        </div>
    );
};

const mapDispatchToProps = {
    updateActiveImageIndexAction: updateActiveImageIndex,
    addImageDataAction: addImageData,
    updateProjectDataAction: updateProjectData,
    updateActivePopupTypeAction: updateActivePopupType,
};

const mapStateToProps = (state: AppState) => ({
    projectData: state.general.projectData,
});

export default connect(mapStateToProps, mapDispatchToProps)(ImagesDropZone);
